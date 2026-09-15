import type { Employee, LeaveRequest, LeaveType } from '@/types/database';

export type { LeaveRequest, LeaveType };

// Shared, full-word labels — used by both the request-type dropdown and
// request cards/history, so there's exactly one source of truth for what
// each type is called (previously the picker showed "Urgent" while every
// other screen showed "Emergency" for the same value, a width-driven
// workaround the dropdown no longer needs).
export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  vacation: 'Vacation',
  sick: 'Sick leave',
  emergency: 'Emergency',
  other: 'Other',
};

export type LeaveRequestWithEmployee = LeaveRequest & {
  employees: Pick<Employee, 'id' | 'name'>;
};

export type NewLeaveRequestInput = {
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  reason: string;
  // Optional supporting evidence — a photo (e.g. a flooded road) and/or the
  // employee's current location at submission time. Both genuinely
  // optional: most requests (planned vacation, routine sick leave) need
  // neither.
  attachmentPath?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  locationAddress?: string | null;
};

// Only 'vacation' counts against this — sick/emergency/other stay
// unlimited, matching the common real-world PTO-vs-sick-leave split.
export type LeaveBalance = {
  allotted: number;
  used: number;
  remaining: number;
};
