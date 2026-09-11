import { useCallback, useState } from 'react';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import * as staffService from '../services/staffService';
import type { Employee } from '../types';

export function useStaffList() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setEmployees(await staffService.getAllEmployees());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load staff.');
    } finally {
      setLoading(false);
    }
  }, []);

  useRefetchOnFocus(load);

  return { employees, loading, error, reload: load };
}
