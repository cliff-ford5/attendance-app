import { useCallback, useState } from 'react';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import * as tasksService from '../services/tasksService';
import type { TaskWithAssignee } from '../types';

export function useAllTasks() {
  const [tasks, setTasks] = useState<TaskWithAssignee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTasks(await tasksService.getAllTasks());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load tasks.');
    } finally {
      setLoading(false);
    }
  }, []);

  useRefetchOnFocus(load);

  return { tasks, loading, error, reload: load };
}
