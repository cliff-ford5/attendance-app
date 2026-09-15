import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import { getLocationById } from '@/features/locations/services/locationsService';
import type { Location } from '@/features/locations/types';
import type { DayType } from '@/types/database';
import * as attendanceService from '../services/attendanceService';
import * as geofenceTask from '../services/geofenceTask';
import * as locationService from '../services/locationService';
import type { AttendanceRecord } from '../types';

type PermissionState = 'unknown' | 'explaining' | 'granted' | 'denied' | 'unavailable';

export function useAttendance(employeeId: string | undefined, locationId?: string | null, isRoaming?: boolean) {
  const [openRecord, setOpenRecord] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<PermissionState>('unknown');
  // Whether the OS will still show its own permission dialog on the next
  // request — once it's hard-denied this goes false, and re-requesting
  // silently no-ops instead of prompting, so the blocking gate on
  // CheckInScreen needs to know to send the employee to Settings instead.
  const [canAskAgain, setCanAskAgain] = useState(true);
  // Only ever relevant once checked in at a real location — geofencing has
  // nothing to monitor otherwise. Separate from `permission` (foreground)
  // since "always" is a materially more invasive ask (AGENTS.md).
  const [backgroundPermission, setBackgroundPermission] = useState<PermissionState>('unknown');
  const [busy, setBusy] = useState(false);
  const [location, setLocation] = useState<Location | null>(null);

  const load = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    setError(null);
    try {
      const record = await attendanceService.getOpenRecord(employeeId);
      setOpenRecord(record);
      const foreground = await locationService.getForegroundPermissionStatus();
      setPermission(foreground.status === 'granted' ? 'granted' : 'explaining');
      setCanAskAgain(foreground.canAskAgain);

      let loadedLocation: Location | null = null;
      if (locationId) {
        loadedLocation = await getLocationById(locationId);
        setLocation(loadedLocation);
      } else {
        setLocation(null);
      }

      // Re-arm geofencing on cold start if already checked in at a location
      // and permission was already granted in a previous session — the JS
      // task registration doesn't survive a full app restart on its own.
      // Roaming employees (admin-toggled — see StaffProfileScreen) skip
      // this entirely: they legitimately work across multiple locations,
      // so a geofence around just their *assigned* one would auto-checkout
      // them incorrectly. Reuses the same 'unavailable' state web already
      // gets, since the UI treatment (hide the whole explainer) is identical.
      if (isRoaming) {
        setBackgroundPermission('unavailable');
      } else if (record && loadedLocation && Platform.OS !== 'web') {
        const bgStatus = await locationService.getBackgroundPermissionStatus();
        setBackgroundPermission(bgStatus === 'granted' ? 'granted' : bgStatus === 'unavailable' ? 'unavailable' : 'explaining');
        if (bgStatus === 'granted') {
          await geofenceTask.startGeofencing(loadedLocation).catch(() => {});
        }
      } else if (Platform.OS === 'web') {
        setBackgroundPermission('unavailable');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load attendance status.');
    } finally {
      setLoading(false);
    }
  }, [employeeId, locationId, isRoaming]);

  useRefetchOnFocus(load);

  async function grantPermission() {
    const result = await locationService.requestForegroundPermission();
    setPermission(result.status === 'granted' ? 'granted' : 'denied');
    setCanAskAgain(result.canAskAgain);
  }

  // Only meaningful right after check-in, when there's a location to
  // geofence against. Denial is a valid choice, not an error — the
  // employee just keeps checking out manually, same as before this phase.
  async function grantBackgroundPermissionAndArm() {
    if (isRoaming) return;
    const status = await locationService.requestBackgroundPermission();
    setBackgroundPermission(status === 'granted' ? 'granted' : 'denied');
    if (status === 'granted' && location) {
      await geofenceTask.startGeofencing(location).catch(() => {});
    }
  }

  async function performCheckIn(dayType: DayType = 'full') {
    // Belt-and-suspenders — CheckInScreen already hides/disables the swipe
    // control until permission is granted, but the hook itself refusing to
    // check in without it is what actually makes that a real guarantee,
    // not just a UI convention someone could bypass by wiring a new caller.
    if (!employeeId || permission !== 'granted') return;
    setBusy(true);
    setError(null);
    try {
      const coords = permission === 'granted' ? await locationService.getCurrentCoordinates() : null;
      // Reverse geocoding is a genuinely slow, best-effort lookup (per
      // CLAUDE.md — "never blocks a check-in/out") — it used to be awaited
      // here anyway, stacking its latency on top of the GPS fix with zero
      // visual feedback, which is exactly what read as the swipe "getting
      // stuck." The record now writes with just coordinates immediately;
      // the address is patched in afterward, not blocking `busy`.
      const record = await attendanceService.checkIn(employeeId, coords, dayType, null, location?.expected_start);
      setOpenRecord(record);
      if (coords) {
        locationService
          .reverseGeocode(coords)
          .then((address) => (address ? attendanceService.updateCheckInAddress(record.id, address) : null))
          // Guard against a race where the employee already checked out (or
          // somehow checked into a different record) by the time this slow
          // background lookup resolves — only apply it if this is still
          // the same open record, not whatever's current.
          .then((updated) => updated && setOpenRecord((current) => (current?.id === updated.id ? updated : current)))
          .catch(() => {});
      }

      if (location && Platform.OS !== 'web' && !isRoaming) {
        const bgStatus = await locationService.getBackgroundPermissionStatus();
        if (bgStatus === 'granted') {
          setBackgroundPermission('granted');
          await geofenceTask.startGeofencing(location).catch(() => {});
        } else {
          setBackgroundPermission('explaining');
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not check in.');
    } finally {
      setBusy(false);
    }
  }

  async function performCheckOut() {
    if (!openRecord) return;
    setBusy(true);
    setError(null);
    try {
      const coords = permission === 'granted' ? await locationService.getCurrentCoordinates() : null;
      // Same fix as check-in: don't block the write (or `busy`) on the slow,
      // best-effort reverse-geocode — write immediately, patch the address
      // in afterward. No local state to race here (`openRecord` just goes
      // to null below) — the address shows up next time history is fetched.
      const recordId = openRecord.id;
      await attendanceService.checkOut(recordId, coords, 'manual', null, location?.expected_end);
      setOpenRecord(null);
      if (coords) {
        locationService
          .reverseGeocode(coords)
          .then((address) => (address ? attendanceService.updateCheckOutAddress(recordId, address) : null))
          .catch(() => {});
      }
      if (Platform.OS !== 'web') await geofenceTask.stopGeofencing().catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not check out.');
    } finally {
      setBusy(false);
    }
  }

  return {
    openRecord,
    loading,
    error,
    busy,
    permission,
    canAskAgain,
    grantPermission,
    backgroundPermission,
    hasLocation: Boolean(location),
    grantBackgroundPermissionAndArm,
    checkIn: performCheckIn,
    checkOut: performCheckOut,
    reload: load,
  };
}
