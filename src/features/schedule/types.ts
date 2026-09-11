import type { WeeklyScheduleEntry } from '@/types/database';

export type { WeeklyScheduleEntry };

export type DaySchedule = {
  dayOfWeek: number; // 0 = Sunday .. 6 = Saturday
  isDayOff: boolean;
  startTime: string | null;
  endTime: string | null;
};
