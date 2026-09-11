import { useCallback, useState } from 'react';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import * as tasksService from '../services/tasksService';
import type { TaskEditInput } from '../services/tasksService';
import type { Task, TaskStatus } from '../types';

export function useMyTasks(employeeId: string | undefined) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    setError(null);
    try {
      setTasks(await tasksService.getMyTasks(employeeId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your tasks.');
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useRefetchOnFocus(load);

  async function setStatus(taskId: string, status: TaskStatus) {
    setUpdatingId(taskId);
    try {
      const updated = await tasksService.updateTaskStatus(taskId, status);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update task.');
    } finally {
      setUpdatingId(null);
    }
  }

  async function edit(taskId: string, input: TaskEditInput) {
    setUpdatingId(taskId);
    setError(null);
    try {
      const updated = await tasksService.updateTask(taskId, input);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save changes to this task.');
      return false;
    } finally {
      setUpdatingId(null);
    }
  }

  async function remove(taskId: string) {
    setDeletingId(taskId);
    setError(null);
    try {
      await tasksService.deleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete this task.');
    } finally {
      setDeletingId(null);
    }
  }

  return { tasks, loading, error, updatingId, deletingId, setStatus, edit, remove, reload: load };
}
