import { useState } from 'react';
import { toDateOnly } from '@/lib/dateOnly';
import * as exportService from '../services/exportService';

function firstOfThisMonth() {
  const d = new Date();
  d.setDate(1);
  return d;
}

// Defaults to "this month so far" — a real bounded period, not "everything
// ever" (which is what this used to fetch, unconditionally). Matches what
// a payroll export is actually for: a specific period, not the whole
// table's history.
export function useExportAttendance() {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(firstOfThisMonth());
  const [endDate, setEndDate] = useState(new Date());

  async function exportCsv() {
    setExporting(true);
    setError(null);
    try {
      await exportService.exportAttendanceCsv(toDateOnly(startDate), toDateOnly(endDate));
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not export attendance.');
      return false;
    } finally {
      setExporting(false);
    }
  }

  return { exporting, error, exportCsv, startDate, setStartDate, endDate, setEndDate };
}
