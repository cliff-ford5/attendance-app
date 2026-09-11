import type { Employee, LeaveRequest, LeaveType } from '@/types/database';

export type { LeaveRequest, LeaveType };

export type LeaveRequestWithEmployee = LeaveRequest & {
  employees: Pick<Employee, 'id' | 'name'>;
};

export type NewLeaveRequestInput = {
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  reason: string;
};

// Only 'vacation' counts against this — sick/emergency/other stay
// unlimited, matching the common real-world PTO-vs-sick-leave split.
export type LeaveBalance = {
  allotted: number;
  used: number;
  remaining: number;
};
