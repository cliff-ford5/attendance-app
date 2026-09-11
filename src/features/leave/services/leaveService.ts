import { toDateOnly } from '@/lib/dateOnly';
import { supabase } from '@/services/supabase';
import type { LeaveRequest, LeaveStatus } from '@/types/database';
import type { LeaveBalance, LeaveRequestWithEmployee, NewLeaveRequestInput } from '../types';

function daysInclusive(startDate: string, endDate: string): number {
  const ms = new Date(endDate).getTime() - new Date(startDate).getTime();
  return Math.round(ms / 86_400_000) + 1;
}

// Current-year vacation days only: a request spanning New Year's isn't
// pro-rated across the two years — an edge case not worth the complexity
// for v1.
export async function getLeaveBalance(employeeId: string): Promise<LeaveBalance> {
  const year = new Date().getFullYear();
  const [{ data: employee, error: employeeError }, { data: approved, error: approvedError }] = await Promise.all([
    supabase.from('employees').select('annual_leave_days').eq('id', employeeId).single(),
    supabase
      .from('leave_requests')
      .select('start_date, end_date')
      .eq('employee_id', employeeId)
      .eq('leave_type', 'vacation')
      .eq('status', 'approved')
      .gte('start_date', `${year}-01-01`)
      .lte('start_date', `${year}-12-31`),
  ]);
  if (employeeError) throw employeeError;
  if (approvedError) throw approvedError;

  const allotted = employee?.annual_leave_days ?? 0;
  const used = (approved ?? []).reduce((sum, r) => sum + daysInclusive(r.start_date, r.end_date), 0);
  return { allotted, used, remaining: Math.max(0, allotted - used) };
}

export async function getMyLeaveRequests(employeeId: string): Promise<LeaveRequest[]> {
  const { data, error } = await supabase
    .from('leave_requests')
    .select('*')
    .eq('employee_id', employeeId)
    .order('start_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as LeaveRequest[];
}

export async function getAllLeaveRequests(): Promise<LeaveRequestWithEmployee[]> {
  // leave_requests has two FKs to employees (employee_id, reviewed_by), so
  // the embed must name which one — same fix as tasksService.getAllTasks().
  const { data, error } = await supabase
    .from('leave_requests')
    .select('*, employees:employees!leave_requests_employee_id_fkey(id, name)')
    .order('start_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as LeaveRequestWithEmployee[];
}

export async function createLeaveRequest(employeeId: string, input: NewLeaveRequestInput): Promise<LeaveRequest> {
  const { data, error } = await supabase
    .from('leave_requests')
    .insert({
      employee_id: employeeId,
      leave_type: input.leaveType,
      start_date: toDateOnly(input.startDate),
      end_date: toDateOnly(input.endDate),
      reason: input.reason || null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as LeaveRequest;
}

// Employee withdrawing their own request — the only transition RLS lets a
// non-admin make (see supabase/0007_leave_requests.sql).
export async function cancelLeaveRequest(id: string): Promise<LeaveRequest> {
  const { data, error } = await supabase
    .from('leave_requests')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as LeaveRequest;
}

export async function reviewLeaveRequest(
  id: string,
  status: Extract<LeaveStatus, 'approved' | 'rejected'>,
  reviewerId: string
): Promise<LeaveRequest> {
  const { data, error } = await supabase
    .from('leave_requests')
    .update({ status, reviewed_by: reviewerId, reviewed_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as LeaveRequest;
}
