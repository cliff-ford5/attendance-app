import { useState } from 'react';
import * as tasksService from '../services/tasksService';
import type { NewTaskInput } from '../types';

export function useCreateTask(assignedBy: string | undefined) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(input: NewTaskInput) {
    if (!assignedBy) return;
    setSubmitting(true);
    setError(null);
    try {
      await tasksService.createTask(input, assignedBy);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create task.');
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  return { create, submitting, error };
}
