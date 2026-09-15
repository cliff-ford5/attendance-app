import { useState } from 'react';
import * as attendanceService from '../services/attendanceService';
import type { AttendanceRecordEdits } from '../services/attendanceService';

export function useEditAttendanceRecord() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(recordId: string, edits: AttendanceRecordEdits) {
    setSaving(true);
    setError(null);
    try {
      await attendanceService.updateAttendanceRecord(recordId, edits);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save changes to this record.');
      return false;
    } finally {
      setSaving(false);
    }
  }

  return { saving, error, save };
}
