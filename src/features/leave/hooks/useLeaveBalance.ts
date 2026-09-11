import { useCallback, useState } from 'react';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import * as leaveService from '../services/leaveService';
import type { LeaveBalance } from '../types';

export function useLeaveBalance(employeeId: string | undefined) {
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    setError(null);
    try {
      setBalance(await leaveService.getLeaveBalance(employeeId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your leave balance.');
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useRefetchOnFocus(load);

  return { balance, loading, error, reload: load };
}
