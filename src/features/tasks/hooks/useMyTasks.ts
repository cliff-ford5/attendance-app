import * as Haptics from 'expo-haptics';
import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import * as tasksService from '../services/tasksService';
import type { TaskEditInput } from '../services/tasksService';
import type { TaskStatus, TaskWithAssigner } from '../types';

export function useMyTasks(employeeId: string | undefined) {
  const [tasks, setTasks] = useState<TaskWithAssigner[]>([]);
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
      // Merge, don't replace — `updated` is a plain Task (no assigner
      // join), so replacing the whole row would silently drop the
      // assigner name shown on this list until the next full reload.
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...updated } : t)));
      // Shared by both the employee's own task list and the admin's
      // per-employee Staff Profile tab, so this covers marking a task done
      // either way. Only on completion — the Assigned/In progress toggles
      // aren't a "success" moment worth a buzz.
      if (status === 'done' && Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
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
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...updated } : t)));
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save changes to this task.');
      return false;
    } finally {
      setUpdatingId(null);
    }
  }

  // Removes the task from this list on success, not merges it — once
  // reassigned, it no longer belongs to this employee, so it shouldn't
  // stay visible on their (or this admin's per-employee) list until the
  // next reload.
  async function reassign(taskId: string, newAssignedTo: string) {
    setUpdatingId(taskId);
    setError(null);
    try {
      await tasksService.reassignTask(taskId, newAssignedTo);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reassign this task.');
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

  return { tasks, loading, error, updatingId, deletingId, setStatus, edit, reassign, remove, reload: load };
}
