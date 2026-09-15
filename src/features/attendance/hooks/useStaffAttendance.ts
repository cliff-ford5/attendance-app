import { useCallback, useState } from 'react';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import * as attendanceService from '../services/attendanceService';
import type { AttendanceHistoryFlag } from '../services/attendanceService';
import type { AttendanceWithEmployee } from '../types';

const PAGE_SIZE = 20;

export function useStaffAttendance() {
  const [checkedIn, setCheckedIn] = useState<AttendanceWithEmployee[]>([]);
  const [history, setHistory] = useState<AttendanceWithEmployee[]>([]);
  const [historyFlags, setHistoryFlags] = useState<AttendanceHistoryFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);

  // Depends on historyFlags so applying a filter gets a fresh `load` —
  // which useRefetchOnFocus re-runs immediately while this screen is
  // already focused (same as any other dependency change on a focused
  // screen, not just on a real navigation-focus event). Always starts back
  // at offset 0, which is exactly the reset pagination needs on a filter
  // change.
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [currentlyIn, page] = await Promise.all([
        attendanceService.getCurrentlyCheckedIn(),
        attendanceService.getRecentHistory(0, PAGE_SIZE, historyFlags),
      ]);
      setCheckedIn(currentlyIn);
      setHistory(page.records);
      setHasMoreHistory(page.hasMore);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load staff attendance.');
    } finally {
      setLoading(false);
    }
  }, [historyFlags]);

  useRefetchOnFocus(load);

  async function loadMoreHistory() {
    if (loadingMore || !hasMoreHistory) return;
    setLoadingMore(true);
    try {
      const page = await attendanceService.getRecentHistory(history.length, PAGE_SIZE, historyFlags);
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
    historyFlags,
    setHistoryFlags,
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
