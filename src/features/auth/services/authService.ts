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

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function fetchProfile(userId: string): Promise<Employee> {
  const { data, error } = await supabase.from('employees').select('*').eq('id', userId).single();
  if (error) throw error;
  return data as Employee;
}
