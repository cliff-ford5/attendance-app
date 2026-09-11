import { useCallback, useState } from 'react';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import * as attendanceService from '../services/attendanceService';
import type { AttendanceRecord } from '../types';

// Fetches one attendance record directly by id, for the detail screen —
// not "find it in whatever's already loaded," which broke as soon as
// useMyAttendanceHistory became paginated (a record more than one page
// back would silently 404 in the UI even though it exists).
export function useAttendanceRecord(id: string | undefined) {
  const [record, setRecord] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setRecord(await attendanceService.getAttendanceRecordById(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load this attendance record.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useRefetchOnFocus(load);

  return { record, loading, error, reload: load };
}
