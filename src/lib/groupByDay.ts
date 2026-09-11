import { toDateOnly } from './dateOnly';

// Shared by every attendance list that groups records by the calendar day
// they started on (MyAttendanceScreen, StaffAttendanceScreen's Recent
// history tab, StaffProfileScreen's attendance section) — pure, no feature
// dependencies. Groups by check_in_at's *local* day, same "attribute the
// whole shift to the day it started" call the weekly timesheet grid makes.
//
// The display label omits the year when it's the current one (a normal
// recent list reads as "Mon, Sep 8", not "Mon, Sep 8, 2026" on every row),
// but the *grouping key* is always the full `toDateOnly` calendar date —
// two Sep 8ths a year apart must never merge into one section just because
// their display labels happen to look the same. A real bug this exact
// shortcut caused before the key/label split existed.
export function dayLabel(iso: string): string {
  const date = new Date(iso);
  const opts: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
  if (date.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';
  return date.toLocaleDateString(undefined, opts);
}

export type DaySection<T> = { key: string; title: string; data: T[] };

export function groupByDay<T extends { check_in_at: string }>(records: T[]): DaySection<T>[] {
  const map = new Map<string, T[]>();
  for (const record of records) {
    const key = toDateOnly(new Date(record.check_in_at));
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(record);
  }
  return Array.from(map.entries()).map(([key, data]) => ({ key, title: dayLabel(data[0].check_in_at), data }));
}
