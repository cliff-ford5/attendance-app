// Monday-first display order, even though day_of_week itself follows JS's
// Date.getDay() (0 = Sunday .. 6 = Saturday) — a work-week reads better
// starting on Monday than on Sunday.
export const SCHEDULE_DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const DAY_LABELS: Record<number, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};
