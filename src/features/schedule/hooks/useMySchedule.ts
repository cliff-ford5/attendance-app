import { useCallback, useState } from 'react';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import * as scheduleService from '../services/scheduleService';
import type { DaySchedule } from '../types';

// Sensible defaults for an employee who's never saved a schedule yet —
// Mon-Fri 9-6, weekend off. Not persisted until they actually hit save.
const DEFAULT_DAYS: DaySchedule[] = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
  dayOfWeek,
  isDayOff: dayOfWeek === 0 || dayOfWeek === 6,
  startTime: '09:00',
  endTime: '18:00',
}));

// Generic on employeeId (not employee-self-specific despite the name),
// same reuse pattern as useMyAttendanceHistory/useMyTasks — lets the
// admin's read-only Staff Profile view reuse this instead of a second
// Supabase call.
export function useMySchedule(employeeId: string | undefined) {
  const [days, setDays] = useState<DaySchedule[]>(DEFAULT_DAYS);
  const [hasSavedSchedule, setHasSavedSchedule] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    setError(null);
    try {
      const entries = await scheduleService.getScheduleForEmployee(employeeId);
      setHasSavedSchedule(entries.length > 0);
      setDays(
        DEFAULT_DAYS.map((fallback) => {
          const saved = entries.find((e) => e.day_of_week === fallback.dayOfWeek);
          return saved
            ? {
                dayOfWeek: saved.day_of_week,
                isDayOff: saved.is_day_off,
                startTime: saved.start_time,
                endTime: saved.end_time,
              }
            : fallback;
        })
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the schedule.');
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useRefetchOnFocus(load);

  function updateDay(dayOfWeek: number, patch: Partial<DaySchedule>) {
    setDays((prev) => prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, ...patch } : d)));
  }

  async function save() {
    if (!employeeId) return false;
    setSaving(true);
    setError(null);
    try {
      await scheduleService.saveSchedule(employeeId, days);
      setHasSavedSchedule(true);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your schedule.');
      return false;
    } finally {
      setSaving(false);
    }
  }

  return { days, hasSavedSchedule, loading, saving, error, updateDay, save, reload: load };
}
