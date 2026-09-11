// Shared by any screen editing an "HH:MM" time-of-day string via a native
// time picker (which works in terms of Date, not strings) — locations'
// expected work hours and the employee's weekly schedule both need this.
export function timeToDate(time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d;
}

export function dateToTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
