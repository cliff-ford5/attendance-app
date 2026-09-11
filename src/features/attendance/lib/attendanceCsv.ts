import { formatDuration } from '@/lib/formatDuration';
import type { AttendanceWithEmployee } from '../types';

const CHECK_OUT_TYPE_LABELS: Record<string, string> = {
  manual: 'Manual',
  auto_geofence: 'Auto (geofence)',
  admin_correction: 'Admin correction',
};

// Quote a field only if it needs it (contains a comma, quote, or newline) —
// keeps the common case (plain names/times) readable in the raw string.
function csvField(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

const HEADER = [
  'Employee',
  'Date',
  'Check-in',
  'Check-out',
  'Duration',
  'Day type',
  'Late',
  'Left early',
  'Check-out type',
];

export function attendanceRecordsToCsv(records: AttendanceWithEmployee[]): string {
  const rows = records.map((r) => {
    const checkIn = new Date(r.check_in_at);
    const checkOut = r.check_out_at ? new Date(r.check_out_at) : null;
    return [
      r.employees?.name ?? 'Unknown',
      checkIn.toLocaleDateString(),
      checkIn.toLocaleTimeString(),
      checkOut ? checkOut.toLocaleTimeString() : 'Still checked in',
      checkOut ? formatDuration(r.check_in_at, r.check_out_at!) : '',
      r.day_type === 'half' ? 'Half day' : 'Full day',
      r.is_late ? 'Yes' : 'No',
      r.left_early ? 'Yes' : 'No',
      r.check_out_type ? (CHECK_OUT_TYPE_LABELS[r.check_out_type] ?? r.check_out_type) : '',
    ].map(csvField);
  });

  return [HEADER, ...rows].map((row) => row.join(',')).join('\n');
}
