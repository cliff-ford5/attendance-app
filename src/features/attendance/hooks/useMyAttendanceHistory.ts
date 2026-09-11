import { useCallback, useState } from 'react';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import * as attendanceService from '../services/attendanceService';
import type { AttendanceRecord } from '../types';

const PAGE_SIZE = 20;

// Generic on employeeId (not employee-self-specific despite the name), used
// by both the employee's own Attendance tab and the admin's read-only
// per-employee "Shifts & Attendance" tab. Paginated — see
// attendanceService.getHistoryForEmployee's own comment for why a flat
// limit doesn't hold up over the life of the app.
export function useMyAttendanceHistory(employeeId: string | undefined) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    setError(null);
    try {
      const page = await attendanceService.getHistoryForEmployee(employeeId, 0, PAGE_SIZE);
      setRecords(page.records);
      setHasMore(page.hasMore);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your attendance history.');
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useRefetchOnFocus(load);

  async function loadMore() {
    if (!employeeId || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const page = await attendanceService.getHistoryForEmployee(employeeId, records.length, PAGE_SIZE);
      setRecords((prev) => [...prev, ...page.records]);
      setHasMore(page.hasMore);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load more history.');
    } finally {
      setLoadingMore(false);
    }
  }

  return { records, loading, loadingMore, hasMore, loadMore, error, reload: load };
}
