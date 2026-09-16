import { supabase } from '@/services/supabase';
import type { Employee } from '@/types/database';
import type { SignInInput, SignUpInput } from '../types';

export async function signIn({ email, password }: SignInInput) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

// Self-serve signup — a stopgap until an admin-provisioning screen exists
// (see TODO.md). The `employees` row itself is created by a database
// trigger (see supabase/0003_auto_create_employee_profile.sql), always as
// role 'employee' — not inserted here — since this project has email
// confirmation enabled, so there's no guarantee of an active session
// immediately after signUp() to insert as. Returns whether the account
// still needs email confirmation before it can sign in.
export async function signUp({ name, email, password }: SignUpInput): Promise<{ needsEmailConfirmation: boolean }> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) throw error;
  return { needsEmailConfirmation: !data.session };
}

// The reset email links to a web page, not back into this app — a mobile
// app can't be the direct target of an email link without deep-link
// handling this project doesn't have. attendance-admin (already deployed,
// already talks to the same Supabase project) hosts the actual
// "set new password" page. Requires this exact URL to be added to
// Supabase's Auth > URL Configuration > Redirect URLs allow-list in the
// dashboard, or Supabase silently falls back to the default Site URL
// instead of redirecting here.
export async function sendPasswordReset(email: string): Promise<void> {
  const adminWebUrl = process.env.EXPO_PUBLIC_ADMIN_WEB_URL;
  if (!adminWebUrl) throw new Error('Password reset is not configured (EXPO_PUBLIC_ADMIN_WEB_URL is missing).');
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${adminWebUrl}/reset-password`,
  });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function fetchProfile(userId: string): Promise<Employee> {
  const { data, error } = await supabase.from('employees').select('*').eq('id', userId).single();
  if (error) throw error;
  return data as Employee;
}
