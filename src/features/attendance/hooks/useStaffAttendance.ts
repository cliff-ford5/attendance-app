import { useCallback, useState } from 'react';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import * as attendanceService from '../services/attendanceService';
import type { AttendanceWithEmployee } from '../types';

const PAGE_SIZE = 20;

export function useStaffAttendance() {
  const [checkedIn, setCheckedIn] = useState<AttendanceWithEmployee[]>([]);
  const [history, setHistory] = useState<AttendanceWithEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [currentlyIn, page] = await Promise.all([
        attendanceService.getCurrentlyCheckedIn(),
        attendanceService.getRecentHistory(0, PAGE_SIZE),
      ]);
      setCheckedIn(currentlyIn);
      setHistory(page.records);
      setHasMoreHistory(page.hasMore);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load staff attendance.');
    } finally {
      setLoading(false);
    }
  }, []);

  useRefetchOnFocus(load);

  async function loadMoreHistory() {
    if (loadingMore || !hasMoreHistory) return;
    setLoadingMore(true);
    try {
      const page = await attendanceService.getRecentHistory(history.length, PAGE_SIZE);
      setHistory((prev) => [...prev, ...page.records]);
      setHasMoreHistory(page.hasMore);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load more history.');
    } finally {
      setLoadingMore(false);
    }
  }

  async function closeOutRecord(recordId: string) {
    setClosingId(recordId);
    setError(null);
    try {
      await attendanceService.adminCheckOut(recordId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not check this employee out.');
    } finally {
      setClosingId(null);
    }
  }

  return {
    checkedIn,
    history,
    loading,
    loadingMore,
    hasMoreHistory,
    error,
    closingId,
    closeOutRecord,
    loadMoreHistory,
    reload: load,
  };
}
