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

export function useAttendance(employeeId: string | undefined, locationId?: string | null) {
  const [openRecord, setOpenRecord] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<PermissionState>('unknown');
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
      const status = await locationService.getForegroundPermissionStatus();
      setPermission(status === 'granted' ? 'granted' : 'explaining');

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
      if (record && loadedLocation && Platform.OS !== 'web') {
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
  }, [employeeId, locationId]);

  useRefetchOnFocus(load);

  async function grantPermission() {
    const status = await locationService.requestForegroundPermission();
    setPermission(status === 'granted' ? 'granted' : 'denied');
  }

  // Only meaningful right after check-in, when there's a location to
  // geofence against. Denial is a valid choice, not an error — the
  // employee just keeps checking out manually, same as before this phase.
  async function grantBackgroundPermissionAndArm() {
    const status = await locationService.requestBackgroundPermission();
    setBackgroundPermission(status === 'granted' ? 'granted' : 'denied');
    if (status === 'granted' && location) {
      await geofenceTask.startGeofencing(location).catch(() => {});
    }
  }

  async function performCheckIn(dayType: DayType = 'full') {
    if (!employeeId) return;
    setBusy(true);
    setError(null);
    try {
      const coords = permission === 'granted' ? await locationService.getCurrentCoordinates() : null;
      const address = coords ? await locationService.reverseGeocode(coords) : null;
      const record = await attendanceService.checkIn(employeeId, coords, dayType, address, location?.expected_start);
      setOpenRecord(record);

      if (location && Platform.OS !== 'web') {
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
      const address = coords ? await locationService.reverseGeocode(coords) : null;
      await attendanceService.checkOut(openRecord.id, coords, 'manual', address, location?.expected_end);
      setOpenRecord(null);
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
    grantPermission,
    backgroundPermission,
    hasLocation: Boolean(location),
    grantBackgroundPermissionAndArm,
    checkIn: performCheckIn,
    checkOut: performCheckOut,
    reload: load,
  };
}
