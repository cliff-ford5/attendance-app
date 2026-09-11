import { useState } from 'react';
import * as leaveService from '../services/leaveService';
import type { NewLeaveRequestInput } from '../types';

export function useCreateLeaveRequest(employeeId: string | undefined) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(input: NewLeaveRequestInput) {
    if (!employeeId) return false;
    setSubmitting(true);
    setError(null);
    try {
      await leaveService.createLeaveRequest(employeeId, input);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit your request.');
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  return { create, submitting, error };
}
