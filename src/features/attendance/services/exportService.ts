import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import { attendanceRecordsToCsv } from '../lib/attendanceCsv';
import * as attendanceService from './attendanceService';

// Mobile-only: there's no "download" concept here, just handing the file to
// the OS share sheet (Drive, email, Files, etc.) — the standard way a
// mobile app "exports" something, unlike a website's direct file download.
// Scoped to a real date range (see attendanceService.getAttendanceForExport)
// rather than the whole table — both the filename and the picked range make
// it clear exactly what period a given export covers.
export async function exportAttendanceCsv(startDate: string, endDate: string): Promise<void> {
  if (Platform.OS === 'web') {
    throw new Error('Export is only available in the mobile app, not on web.');
  }

  const records = await attendanceService.getAttendanceForExport(startDate, endDate);
  const csv = attendanceRecordsToCsv(records);

  if (!FileSystem.cacheDirectory) {
    throw new Error('No writable cache directory is available on this device.');
  }
  const fileUri = `${FileSystem.cacheDirectory}attendance-export-${startDate}_to_${endDate}.csv`;
  await FileSystem.writeAsStringAsync(fileUri, csv);

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Sharing isn’t available on this device.');
  }
  await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Export attendance' });
}
