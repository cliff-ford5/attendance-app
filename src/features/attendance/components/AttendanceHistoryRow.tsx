import { StyleSheet, View } from 'react-native';
import { Chip, IconButton, List } from 'react-native-paper';
import { AppAvatar } from '@/components/AppAvatar';
import { statusColors } from '@/constants/theme';
import { formatDuration } from '@/lib/formatDuration';
import { dayLabel } from '@/lib/groupByDay';
import { openInMaps } from '../services/locationService';
import type { AttendanceRecord, AttendanceWithEmployee } from '../types';

// One row of attendance history, shared by every screen that lists these
// records: MyAttendanceScreen (own history, no employee name needed),
// StaffAttendanceScreen (cross-employee, both the live "checked in" list and
// the paginated "Recent history" list), and StaffProfileScreen's
// per-employee attendance section. Previously each screen had its own
// near-identical copy of this — same duplication `formatDuration` and
// `timeToDate`/`dateToTime` were extracted for.
export function AttendanceHistoryRow({
  record,
  showEmployee = false,
  onRequestCheckOut,
  closing = false,
  onPress,
}: {
  record: AttendanceRecord | AttendanceWithEmployee;
  showEmployee?: boolean;
  onRequestCheckOut?: (record: AttendanceWithEmployee) => void;
  closing?: boolean;
  onPress?: () => void;
}) {
  const employee = 'employees' in record ? record.employees : undefined;
  const isOpen = !record.check_out_at;
  const mapCoords =
    record.check_out_lat != null && record.check_out_lng != null
      ? { latitude: record.check_out_lat, longitude: record.check_out_lng }
      : record.check_in_lat != null && record.check_in_lng != null
        ? { latitude: record.check_in_lat, longitude: record.check_in_lng }
        : null;
  const address = record.check_out_address ?? record.check_in_address;
  const flags = [
    record.day_type === 'half' && 'Half day',
    record.is_late && 'Late',
    record.left_early && 'Left early',
  ].filter(Boolean);

  const inTime = new Date(record.check_in_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const outTime = record.check_out_at
    ? new Date(record.check_out_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : null;
  const timesText = `In ${inTime}` + (outTime ? `  →  Out ${outTime}` : '');
  const statusText = isOpen ? 'Still checked in' : formatDuration(record.check_in_at, record.check_out_at!);

  // Cross-employee rows (showEmployee) always name their date explicitly —
  // unlike the employee's own history, these aren't guaranteed to sit under
  // a date-grouped section header (the admin's "Currently checked in" tab
  // is a flat, ungrouped list), and "In 9:02 AM" with no date is genuinely
  // ambiguous for a record open long enough to need the admin-correction
  // feature in the first place. The own-history rows skip it — every
  // screen that renders those already groups by day, so repeating the date
  // on every row would be pure clutter, not clarity.
  const dateText = showEmployee ? dayLabel(record.check_in_at) : null;

  return (
    <List.Item
      onPress={onPress}
      title={showEmployee ? (employee?.name ?? 'Unknown') : timesText}
      description={
        (dateText ? `${dateText} · ` : '') +
        (showEmployee ? `${timesText}  ·  ` : '') +
        statusText +
        (flags.length ? ` · ${flags.join(' · ')}` : '') +
        (address ? `\n${address}` : '')
      }
      descriptionNumberOfLines={3}
      left={(props) =>
        showEmployee ? (
          <AppAvatar name={employee?.name} avatarPath={employee?.avatar_path} style={props.style} />
        ) : (
          <List.Icon {...props} icon={isOpen ? 'clock-outline' : 'clock-check-outline'} />
        )
      }
      right={(props) => (
        <View style={[styles.rightRow, props.style]}>
          {isOpen ? (
            showEmployee && (
              <Chip compact style={[styles.statusChip, { backgroundColor: statusColors.success }]} textStyle={styles.chipText}>
                In
              </Chip>
            )
          ) : record.check_out_type === 'auto_geofence' ? (
            <Chip compact style={[styles.statusChip, { backgroundColor: statusColors.warning }]} textStyle={styles.chipText}>
              Auto out
            </Chip>
          ) : record.check_out_type === 'admin_correction' ? (
            <Chip compact style={[styles.statusChip, { backgroundColor: statusColors.neutral }]} textStyle={styles.chipText}>
              Admin correction
            </Chip>
          ) : null}
          {mapCoords && (
            <IconButton
              icon="map-marker-outline"
              size={16}
              style={styles.rowIconButton}
              onPress={() => openInMaps(mapCoords)}
              accessibilityLabel="View on map"
            />
          )}
          {isOpen && onRequestCheckOut && (
            <IconButton
              icon="logout"
              size={16}
              style={styles.rowIconButton}
              disabled={closing}
              onPress={() => onRequestCheckOut(record as AttendanceWithEmployee)}
              accessibilityLabel={`Check out ${employee?.name ?? ''}`}
            />
          )}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  chipText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  statusChip: {
    height: 28,
  },
  rowIconButton: {
    margin: 0,
    marginLeft: -4,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
});
