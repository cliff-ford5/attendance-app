import { useCallback, useState } from 'react';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import * as attendanceService from '../services/attendanceService';

// A small, explicitly month-scoped query — not "count distinct days out of
// however much of the paginated history happens to be in memory," which
// would silently undercount once useMyAttendanceHistory's first page no
// longer safely covers a full month's worth of records.
export function useDaysCheckedInThisMonth(employeeId: string | undefined) {
  const [days, setDays] = useState(0);

  const load = useCallback(async () => {
    if (!employeeId) return;
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    try {
      const records = await attendanceService.getMyRecordsSince(employeeId, monthStart.toISOString());
      setDays(new Set(records.map((r) => new Date(r.check_in_at).toDateString())).size);
    } catch {
      // Informational stat only — a failed fetch here shouldn't block or
      // error out the whole Check-In screen, just leave the count as-is.
    }
  }, [employeeId]);

  useRefetchOnFocus(load);

  return days;
}
