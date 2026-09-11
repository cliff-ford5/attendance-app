import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { supabase } from '@/services/supabase';
import * as attendanceService from './attendanceService';
import { getCurrentCoordinates } from './locationService';

export const GEOFENCE_TASK_NAME = 'attendance-geofence-task';

// Registered unconditionally at module load (per Expo's documented
// pattern) — this file must be imported once, early, regardless of auth
// state, so the OS can relaunch the app into this handler in the
// background even if no screen is mounted. See src/app/_layout.tsx.
//
// Deliberately reads the open record from Supabase rather than trusting
// any locally-cached record id — this task can fire minutes or hours
// after the app's JS was last running, so cached state could be stale;
// the server is the only reliable source of "is this employee still
// checked in" at the moment the exit event actually arrives.
TaskManager.defineTask(GEOFENCE_TASK_NAME, async ({ data, error }) => {
  if (error) return;
  const { eventType } = (data ?? {}) as { eventType?: Location.GeofencingEventType };
  if (eventType !== Location.GeofencingEventType.Exit) return;

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const employeeId = session?.user.id;
    if (!employeeId) return;

    const openRecord = await attendanceService.getOpenRecord(employeeId);
    if (!openRecord) return;

    // Best-effort — a background task's location read can fail or be
    // throttled by the OS; the auto-checkout still happens without it.
    const coords = await getCurrentCoordinates();
    await attendanceService.checkOut(openRecord.id, coords, 'auto_geofence');
    await stopGeofencing();
  } catch {
    // Swallow — a background task has no UI to surface an error to, and
    // the employee can still check out manually if this silently failed.
  }
});

export async function startGeofencing(location: { id: string; latitude: number; longitude: number; radius_meters: number }) {
  await Location.startGeofencingAsync(GEOFENCE_TASK_NAME, [
    {
      identifier: location.id,
      latitude: location.latitude,
      longitude: location.longitude,
      radius: location.radius_meters,
      notifyOnEnter: false,
      notifyOnExit: true,
    },
  ]);
}

export async function stopGeofencing() {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK_NAME);
  if (isRegistered) await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
}

export async function isGeofencingActive(): Promise<boolean> {
  return TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK_NAME);
}
