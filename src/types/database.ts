// Hand-written to match supabase/0001_initial_schema.sql. Once a real
// Supabase project exists, regenerate with `supabase gen types typescript`
// and reconcile (see RULES.md's schema-change convention).

export const APP_ROLES = ['employee', 'admin', 'superAdmin'] as const;
export type AppRole = (typeof APP_ROLES)[number];

export const TASK_STATUSES = ['assigned', 'in_progress', 'done'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export type CheckOutType = 'manual' | 'auto_geofence' | 'admin_correction';

export const DAY_TYPES = ['full', 'half'] as const;
export type DayType = (typeof DAY_TYPES)[number];

export type Location = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  expected_start: string;
  expected_end: string;
};

export type Holiday = {
  id: string;
  name: string;
  date: string;
  blocks_check_in: boolean;
  created_at: string;
};

export type Employee = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  position: string | null;
  department: string | null;
  location_id: string | null;
  active: boolean;
  start_date: string | null;
  mobile_number: string | null;
  annual_leave_days: number;
  avatar_path: string | null;
  // Skips arming Phase 2's background auto-checkout geofence for this
  // employee — for staff who legitimately work across multiple locations,
  // so leaving their *assigned* location's radius doesn't auto-check them
  // out. Doesn't affect check-in itself, which was never location-gated.
  is_roaming: boolean;
  created_at: string;
};

export type AttendanceRecord = {
  id: string;
  employee_id: string;
  check_in_at: string;
  check_in_lat: number | null;
  check_in_lng: number | null;
  check_in_address: string | null;
  check_out_at: string | null;
  check_out_lat: number | null;
  check_out_lng: number | null;
  check_out_address: string | null;
  check_out_type: CheckOutType | null;
  day_type: DayType;
  is_late: boolean;
  left_early: boolean;
};

export const LEAVE_TYPES = ['vacation', 'sick', 'emergency', 'other'] as const;
export type LeaveType = (typeof LEAVE_TYPES)[number];

export const LEAVE_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'] as const;
export type LeaveStatus = (typeof LEAVE_STATUSES)[number];

export type LeaveRequest = {
  id: string;
  employee_id: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: LeaveStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  attachment_path: string | null;
  location_lat: number | null;
  location_lng: number | null;
  location_address: string | null;
};

export type WeeklyScheduleEntry = {
  id: string;
  employee_id: string;
  day_of_week: number; // 0 = Sunday .. 6 = Saturday, matching JS Date.getDay()
  is_day_off: boolean;
  start_time: string | null;
  end_time: string | null;
  updated_at: string;
};

export type Task = {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string;
  assigned_by: string;
  created_at: string;
  deadline: string;
  status: TaskStatus;
  priority: TaskPriority;
  completed_at: string | null;
};
