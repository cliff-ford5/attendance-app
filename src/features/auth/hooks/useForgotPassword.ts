import { useState } from 'react';
import * as authService from '../services/authService';

export function useForgotPassword() {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function sendResetEmail(email: string) {
    setSending(true);
    setError(null);
    try {
      await authService.sendPasswordReset(email);
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the reset email.');
    } finally {
      setSending(false);
    }
  }

  return { sending, error, sent, sendResetEmail };
}
