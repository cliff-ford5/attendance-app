import { useCallback, useState } from 'react';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import * as leaveService from '../services/leaveService';
import type { LeaveRequest } from '../types';

export function useMyLeaveRequests(employeeId: string | undefined) {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    setError(null);
    try {
      setRequests(await leaveService.getMyLeaveRequests(employeeId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your leave requests.');
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useRefetchOnFocus(load);

  async function cancel(id: string) {
    setCancellingId(id);
    try {
      const updated = await leaveService.cancelLeaveRequest(id);
      setRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not cancel this request.');
    } finally {
      setCancellingId(null);
    }
  }

  return { requests, loading, error, cancellingId, cancel, reload: load };
}
