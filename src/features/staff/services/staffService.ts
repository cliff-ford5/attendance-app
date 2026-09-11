import { supabase } from '@/services/supabase';
import type { Employee } from '@/types/database';

// Admin-facing roster browsing — distinct from features/auth, which only
// ever deals with the signed-in user's own session/profile.

export async function getAllEmployees(): Promise<Employee[]> {
  const { data, error } = await supabase.from('employees').select('*').order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Employee[];
}

export async function getEmployeeById(id: string): Promise<Employee> {
  const { data, error } = await supabase.from('employees').select('*').eq('id', id).single();
  if (error) throw error;
  return data as Employee;
}

export async function updateEmployeeLocation(employeeId: string, locationId: string | null): Promise<Employee> {
  const { data, error } = await supabase
    .from('employees')
    .update({ location_id: locationId })
    .eq('id', employeeId)
    .select('*')
    .single();
  if (error) throw error;
  return data as Employee;
}

export type EmployeeProfileInput = {
  name: string;
  position: string;
  department: string;
  mobile_number: string;
};

// Deliberately not `email` — that column just mirrors `auth.users.email`
// (set once, at signup, by the trigger in 0003). Editing it here alone
// would desync the two: the employee's actual login email wouldn't change,
// so they'd still sign in with the old address while the app showed a
// different one everywhere. A real email-change flow needs Supabase Auth's
// own admin API, not a plain table update — out of scope for this pass.
export async function updateEmployee(employeeId: string, input: EmployeeProfileInput): Promise<Employee> {
  const { data, error } = await supabase
    .from('employees')
    .update({
      name: input.name.trim(),
      position: input.position.trim() || null,
      department: input.department.trim() || null,
      mobile_number: input.mobile_number.trim() || null,
    })
    .eq('id', employeeId)
    .select('*')
    .single();
  if (error) throw error;
  return data as Employee;
}
