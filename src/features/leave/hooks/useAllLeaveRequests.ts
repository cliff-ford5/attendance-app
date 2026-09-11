import { useCallback, useState } from 'react';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import * as leaveService from '../services/leaveService';
import type { LeaveRequestWithEmployee } from '../types';

export function useAllLeaveRequests(reviewerId: string | undefined) {
  const [requests, setRequests] = useState<LeaveRequestWithEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRequests(await leaveService.getAllLeaveRequests());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load leave requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useRefetchOnFocus(load);

  async function review(id: string, status: 'approved' | 'rejected') {
    if (!reviewerId) return;
    setReviewingId(id);
    try {
      const updated = await leaveService.reviewLeaveRequest(id, status, reviewerId);
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, ...updated } : r)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update this request.');
    } finally {
      setReviewingId(null);
    }
  }

  return { requests, loading, error, reviewingId, review, reload: load };
}
