// Formats a Date as its LOCAL calendar date (YYYY-MM-DD) — never
// `date.toISOString().slice(0, 10)`, which reads the UTC calendar date
// instead. That's silently wrong for anyone in a timezone ahead of UTC
// during their early-morning local hours: e.g. in UTC+8, at 2am local
// (already "today" locally), `.toISOString()` still reports the previous
// UTC day. Found as a real bug — a leave request's start/end date could
// save as the wrong calendar day, and an "on leave today" check could miss
// today entirely — not a hypothetical.
export function toDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
