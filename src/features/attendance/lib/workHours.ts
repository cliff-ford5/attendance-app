import {
  DEFAULT_WORK_END,
  DEFAULT_WORK_START,
  EARLY_DEPARTURE_GRACE_MINUTES,
  LATE_GRACE_MINUTES,
} from '@/constants/workHours';

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesSinceMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

// expectedStart/End come from the employee's assigned location
// (locations.expected_start/end) when they have one; the global default
// here only covers employees with no location assigned yet.
export function isLateArrival(checkInAt: Date, expectedStart: string = DEFAULT_WORK_START): boolean {
  return minutesSinceMidnight(checkInAt) > parseTimeToMinutes(expectedStart) + LATE_GRACE_MINUTES;
}

export function isEarlyDeparture(checkOutAt: Date, expectedEnd: string = DEFAULT_WORK_END): boolean {
  return minutesSinceMidnight(checkOutAt) < parseTimeToMinutes(expectedEnd) - EARLY_DEPARTURE_GRACE_MINUTES;
}
