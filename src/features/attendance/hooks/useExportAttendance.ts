import { useState } from 'react';
import * as exportService from '../services/exportService';

export function useExportAttendance() {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function exportCsv() {
    setExporting(true);
    setError(null);
    try {
      await exportService.exportAttendanceCsv();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not export attendance.');
    } finally {
      setExporting(false);
    }
  }

  return { exporting, error, exportCsv };
}
