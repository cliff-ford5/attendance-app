import * as ImagePicker from 'expo-image-picker';
import { getCurrentCoordinates, requestForegroundPermission, reverseGeocode } from '@/features/attendance/services/locationService';
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
      attachment_path: input.attachmentPath ?? null,
      location_lat: input.locationLat ?? null,
      location_lng: input.locationLng ?? null,
      location_address: input.locationAddress ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as LeaveRequest;
}

// Picks a photo and uploads it immediately (same "upload on pick, not on
// submit" call as avatarService.pickAndUploadAvatar) — a unique path per
// upload (not a fixed per-employee filename like avatars), since one
// employee can attach different evidence to different requests over time.
// Returns the storage path, or null if the user cancelled picking.
export async function pickAndUploadLeaveAttachment(employeeId: string): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (permission.status !== 'granted') {
    throw new Error('Photo library access is needed to attach a photo.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.7,
  });
  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  const extension = asset.mimeType === 'image/png' ? 'png' : 'jpg';
  const path = `${employeeId}/${Date.now()}.${extension}`;

  const response = await fetch(asset.uri);
  const arrayBuffer = await response.arrayBuffer();

  const { error } = await supabase.storage
    .from('leave-attachments')
    .upload(path, arrayBuffer, { contentType: asset.mimeType ?? 'image/jpeg' });
  if (error) throw error;

  return path;
}

// `leave-attachments` is a private bucket (unlike `avatars`) — viewing an
// attachment needs a short-lived signed URL, not a permanent public one.
export async function getLeaveAttachmentSignedUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from('leave-attachments').createSignedUrl(path, 3600);
  if (error) return null;
  return data?.signedUrl ?? null;
}

// Reuses the same on-device geolocation + reverse-geocoding this app
// already relies on for check-in/out — no new permission flow, just the
// existing foreground one.
export async function getCurrentLeaveLocation(): Promise<{ lat: number; lng: number; address: string | null } | null> {
  const { status } = await requestForegroundPermission();
  if (status !== 'granted') return null;
  const coords = await getCurrentCoordinates();
  if (!coords) return null;
  const address = await reverseGeocode(coords);
  return { lat: coords.latitude, lng: coords.longitude, address };
}

// Employee withdrawing their own request.
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

// Employee editing their own still-pending request's details, instead of
// cancel + resubmit as two separate requests. RLS (`leave_update_own_or_admin`,
// 0027) only allows this while the row is currently 'pending'. Reuses
// NewLeaveRequestInput — same fields, just an update instead of an insert.
export async function updateLeaveRequest(id: string, input: NewLeaveRequestInput): Promise<LeaveRequest> {
  const { data, error } = await supabase
    .from('leave_requests')
    .update({
      leave_type: input.leaveType,
      start_date: toDateOnly(input.startDate),
      end_date: toDateOnly(input.endDate),
      reason: input.reason || null,
      attachment_path: input.attachmentPath ?? null,
      location_lat: input.locationLat ?? null,
      location_lng: input.locationLng ?? null,
      location_address: input.locationAddress ?? null,
    })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as LeaveRequest;
}

// Hard delete — distinct from cancel (a status change). RLS
// (`leave_delete_own_pending_or_cancelled_or_admin`, 0027) scopes an
// employee to their own pending/cancelled requests; a decided
// (approved/rejected) request stays as a record unless an admin removes it.
export async function deleteLeaveRequest(id: string): Promise<void> {
  const { error } = await supabase.from('leave_requests').delete().eq('id', id);
  if (error) throw error;
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
