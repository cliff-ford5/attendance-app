import { supabase } from '@/services/supabase';
import type { AttendanceRecord, CheckOutType, DayType } from '@/types/database';
import { isEarlyDeparture, isLateArrival } from '../lib/workHours';
import type { AttendanceWithEmployee, Coordinates } from '../types';

export async function getOpenRecord(employeeId: string): Promise<AttendanceRecord | null> {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('employee_id', employeeId)
    .is('check_out_at', null)
    .order('check_in_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as AttendanceRecord | null;
}

export async function checkIn(
  employeeId: string,
  coords: Coordinates | null,
  dayType: DayType = 'full',
  address: string | null = null,
  expectedStart?: string
): Promise<AttendanceRecord> {
  const now = new Date();
  const { data, error } = await supabase
    .from('attendance')
    .insert({
      employee_id: employeeId,
      check_in_at: now.toISOString(),
      check_in_lat: coords?.latitude ?? null,
      check_in_lng: coords?.longitude ?? null,
      check_in_address: address,
      day_type: dayType,
      is_late: isLateArrival(now, expectedStart),
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as AttendanceRecord;
}

// Patches in the reverse-geocoded address after the fact — checkIn() itself
// no longer waits on geocoding (see useAttendance's performCheckIn), since
// that's a genuinely slow, best-effort lookup that shouldn't hold up the
// actual check-in write or the UI unblocking.
export async function updateCheckInAddress(recordId: string, address: string): Promise<AttendanceRecord> {
  const { data, error } = await supabase
    .from('attendance')
    .update({ check_in_address: address })
    .eq('id', recordId)
    .select('*')
    .single();
  if (error) throw error;
  return data as AttendanceRecord;
}

export async function checkOut(
  recordId: string,
  coords: Coordinates | null,
  type: CheckOutType = 'manual',
  address: string | null = null,
  expectedEnd?: string
): Promise<AttendanceRecord> {
  const now = new Date();
  const { data, error } = await supabase
    .from('attendance')
    .update({
      check_out_at: now.toISOString(),
      check_out_lat: coords?.latitude ?? null,
      check_out_lng: coords?.longitude ?? null,
      check_out_address: address,
      check_out_type: type,
      left_early: isEarlyDeparture(now, expectedEnd),
    })
    .eq('id', recordId)
    .select('*')
    .single();
  if (error) throw error;
  return data as AttendanceRecord;
}

// Same reasoning as updateCheckInAddress — patched in after checkOut()
// already wrote, not awaited beforehand.
export async function updateCheckOutAddress(recordId: string, address: string): Promise<AttendanceRecord> {
  const { data, error } = await supabase
    .from('attendance')
    .update({ check_out_address: address })
    .eq('id', recordId)
    .select('*')
    .single();
  if (error) throw error;
  return data as AttendanceRecord;
}

// Admin correction — closes out a record the employee themselves forgot to
// check out of. Tagged 'admin_correction' (not 'manual') so history stays
// honest about who actually closed it. No lat/lng — the admin isn't there.
export async function adminCheckOut(recordId: string): Promise<AttendanceRecord> {
  const { data, error } = await supabase
    .from('attendance')
    .update({
      check_out_at: new Date().toISOString(),
      check_out_type: 'admin_correction',
    })
    .eq('id', recordId)
    .select('*')
    .single();
  if (error) throw error;
  return data as AttendanceRecord;
}

// Admin view — everyone currently checked in.
export async function getCurrentlyCheckedIn(): Promise<AttendanceWithEmployee[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select('*, employees(id, name, position, avatar_path)')
    .is('check_out_at', null)
    .order('check_in_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as AttendanceWithEmployee[];
}

// Admin view — recent history across all staff, paginated: this list only
// grows over the life of the app, so a flat `.limit()` either shows too
// little or eventually fetches everything on every load. Fetches one row
// past `pageSize` to know whether there's a next page without a separate
// count query, then trims it off.
// The real, already-tracked anomaly flags on a record — matches what
// Deputy/Homebase-style timesheet views surface as filters. "Admin
// correction" (check_out_type) is deliberately not one of these: it's
// already visible inline per-row, and isn't the kind of thing an admin
// scans a whole history for the way they would "who was late."
//
// Multi-select, not single — these flags genuinely aren't mutually
// exclusive (a record can be both late *and* left early), so a single-
// select control was forcing the wrong shape onto the data. Selected
// flags combine with OR (any match), matching AppFilterSheet's checkboxes.
export type AttendanceHistoryFlag = 'late' | 'leftEarly' | 'halfDay' | 'autoCheckout';

// A server-side filter, not client-side — this list is paginated, so
// filtering only what's already loaded would silently "lose" matching
// records sitting on pages that haven't been fetched yet, unlike the
// client-side filtering Leave/Tasks use on their own unpaginated lists.
export async function getRecentHistory(
  offset: number,
  pageSize: number,
  flags: AttendanceHistoryFlag[] = []
): Promise<{ records: AttendanceWithEmployee[]; hasMore: boolean }> {
  let query = supabase
    .from('attendance')
    .select('*, employees(id, name, position, avatar_path)')
    .order('check_in_at', { ascending: false });

  if (flags.length > 0) {
    const clauses: string[] = [];
    if (flags.includes('late')) clauses.push('is_late.eq.true');
    if (flags.includes('leftEarly')) clauses.push('left_early.eq.true');
    if (flags.includes('halfDay')) clauses.push('day_type.eq.half');
    if (flags.includes('autoCheckout')) clauses.push('check_out_type.eq.auto_geofence');
    query = query.or(clauses.join(','));
  }

  const { data, error } = await query.range(offset, offset + pageSize);
  if (error) throw error;
  const rows = (data ?? []) as unknown as AttendanceWithEmployee[];
  const hasMore = rows.length > pageSize;
  return { records: hasMore ? rows.slice(0, pageSize) : rows, hasMore };
}

// Admin CSV export — scoped to a real date range, not "every record ever."
// Used to be completely unbounded (the actual thing that motivated the
// 2026-09-14 indexing pass) — real payroll exports are for a specific
// period anyway (a pay period, a month), not the entire history since the
// app launched, so this isn't just a performance fix, it matches what the
// export is actually for.
export async function getAttendanceForExport(startDate: string, endDate: string): Promise<AttendanceWithEmployee[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select('*, employees(id, name, position, avatar_path)')
    .gte('check_in_at', `${startDate}T00:00:00`)
    .lte('check_in_at', `${endDate}T23:59:59.999`)
    .order('check_in_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as AttendanceWithEmployee[];
}

// Admin correction of an already-written record — fixing a wrong check-in/
// out time or a wrong half-day flag, or clearing a stray duplicate's
// check-out. Distinct from adminCheckOut (which only closes an open
// record): this can touch any field on any record, open or closed. RLS
// already allows it (`attendance_update_admin`, 0005) — no new migration
// needed, that policy was just unused for anything beyond check-out until
// now.
export type AttendanceRecordEdits = {
  check_in_at: string;
  check_out_at: string | null;
  day_type: DayType;
  is_late: boolean;
  left_early: boolean;
};

export async function updateAttendanceRecord(recordId: string, edits: AttendanceRecordEdits): Promise<AttendanceRecord> {
  const { data, error } = await supabase.from('attendance').update(edits).eq('id', recordId).select('*').single();
  if (error) throw error;
  return data as AttendanceRecord;
}

// Admin-only removal of a whole record — a stray duplicate (e.g. a
// geofence double-fire), not something to "correct" via updateAttendanceRecord.
// RLS: `attendance_delete_admin_only`, 0025.
export async function deleteAttendanceRecord(recordId: string): Promise<void> {
  const { error } = await supabase.from('attendance').delete().eq('id', recordId);
  if (error) throw error;
}

// Admin dashboard — every check-in since local midnight, across all staff.
// Small, naturally bounded dataset (one day's worth), so no pagination.
export async function getTodayAttendance(sinceIso: string): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase.from('attendance').select('*').gte('check_in_at', sinceIso);
  if (error) throw error;
  return (data ?? []) as AttendanceRecord[];
}

// Employee's own "time in/out per day" view, paginated — same reasoning as
// getRecentHistory: this grows unbounded over the life of the app (a year
// of daily use is ~250+ rows for one employee alone), so a flat `.limit()`
// either shows too little once real usage accumulates or eventually
// re-fetches everything on every load. Used generically by employeeId, so
// the admin's per-employee "Shifts & Attendance" tab gets the same
// pagination for free rather than a second implementation.
export async function getHistoryForEmployee(
  employeeId: string,
  offset: number,
  pageSize: number
): Promise<{ records: AttendanceRecord[]; hasMore: boolean }> {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('employee_id', employeeId)
    .order('check_in_at', { ascending: false })
    .range(offset, offset + pageSize);
  if (error) throw error;
  const rows = (data ?? []) as AttendanceRecord[];
  const hasMore = rows.length > pageSize;
  return { records: hasMore ? rows.slice(0, pageSize) : rows, hasMore };
}

// A single record by id, for the attendance detail screen — deliberately
// not "find it in whatever page of getHistoryForEmployee happens to be
// loaded," since that breaks the moment a record is more than one page
// back (or, on the grid's own known limitation, further back than what's
// currently loaded at all). RLS (`attendance_select_own_or_admin`) is what
// actually keeps this scoped to the caller's own records — no employeeId
// needed here on the client side.
export async function getAttendanceRecordById(id: string): Promise<AttendanceRecord | null> {
  const { data, error } = await supabase.from('attendance').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as AttendanceRecord | null;
}

// Employee's own check-ins since a given instant (Check-In screen's "days
// this month" stat) — an explicitly date-scoped query rather than counting
// distinct days out of whatever page of the paginated history happens to be
// in memory, so the stat stays correct regardless of how far the employee's
// own Attendance tab has been paged.
export async function getMyRecordsSince(employeeId: string, sinceIso: string): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('employee_id', employeeId)
    .gte('check_in_at', sinceIso)
    .order('check_in_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as AttendanceRecord[];
}
