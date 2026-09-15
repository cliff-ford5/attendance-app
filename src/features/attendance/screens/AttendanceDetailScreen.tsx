import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Card, Chip, Dialog, Portal, Text, useTheme, Button as PaperButton } from 'react-native-paper';
import { AppHeader } from '@/components/AppHeader';
import { ErrorState, LoadingState, NotConfiguredState } from '@/components/ScreenState';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { isSupabaseConfigured } from '@/services/supabase';
import { statusColors } from '@/constants/theme';
import { formatDuration } from '@/lib/formatDuration';
import { dayLabel } from '@/lib/groupByDay';
import { useAttendanceRecord } from '../hooks/useAttendanceRecord';
import * as attendanceService from '../services/attendanceService';
import { openInMaps } from '../services/locationService';

// Fetches the one record directly by id (RLS scopes it to the caller's own
// rows) — not "find it in whatever's loaded," which breaks for anything
// beyond the paginated list's first page or two. Shared by both the
// employee's own history and the admin's cross-employee history — the
// header's Edit action (added 2026-09-14) only appears for admins, decided
// here rather than duplicated per route group, same reasoning as the task/
// location forms deciding their own dynamic title.
export function AttendanceDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const { record, loading, error, reload } = useAttendanceRecord(id);
  const isAdmin = profile?.role === 'admin' || profile?.role === 'superAdmin';
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function confirmDelete() {
    if (!id) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await attendanceService.deleteAttendanceRecord(id);
      setDeleteConfirmVisible(false);
      router.back();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Could not delete this record.');
    } finally {
      setDeleting(false);
    }
  }

  const header = (
    <Stack.Screen
      options={{
        header: () => (
          <AppHeader
            title="Attendance details"
            onBack={() => router.back()}
            actions={
              isAdmin
                ? [
                    { icon: 'pencil-outline', onPress: () => router.push(`/(admin)/attendance/edit?id=${id}`), accessibilityLabel: 'Edit' },
                    { icon: 'trash-can-outline', onPress: () => setDeleteConfirmVisible(true), accessibilityLabel: 'Delete' },
                  ]
                : undefined
            }
          />
        ),
      }}
    />
  );

  if (!isSupabaseConfigured)
    return (
      <>
        {header}
        <NotConfiguredState />
      </>
    );
  if (loading)
    return (
      <>
        {header}
        <LoadingState label="Loading…" />
      </>
    );
  if (error)
    return (
      <>
        {header}
        <ErrorState message={error} onRetry={reload} />
      </>
    );
  if (!record)
    return (
      <>
        {header}
        <ErrorState message="This attendance record couldn't be found." onRetry={reload} />
      </>
    );

  const isOpen = !record.check_out_at;
  const dateLabel = new Date(record.check_in_at).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const flags = [
    record.day_type === 'half' && 'Half day',
    record.is_late && 'Late',
    record.left_early && 'Left early',
  ].filter(Boolean) as string[];

  const checkInCoords =
    record.check_in_lat != null && record.check_in_lng != null
      ? { latitude: record.check_in_lat, longitude: record.check_in_lng }
      : null;
  const checkOutCoords =
    record.check_out_lat != null && record.check_out_lng != null
      ? { latitude: record.check_out_lat, longitude: record.check_out_lng }
      : null;

  // The page-level date header above is derived from check-in alone — for
  // an overnight shift (checked out after midnight), check-out genuinely
  // falls on a different calendar day, so each card names its own date
  // rather than relying on that single header being correct for both legs.
  function dateTime(iso: string) {
    return `${dayLabel(iso)}, ${new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }

  const checkOutNote =
    record.check_out_type === 'auto_geofence'
      ? 'Automatically checked out when you left your assigned location.'
      : record.check_out_type === 'admin_correction'
        ? 'This checkout was entered by an admin, not by you.'
        : null;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {header}
      <Text variant="titleMedium" style={styles.date}>
        {dateLabel}
      </Text>

      <Card style={styles.card}>
        <Card.Content style={styles.durationContent}>
          <Text variant="displaySmall">{isOpen ? 'Still in' : formatDuration(record.check_in_at, record.check_out_at!)}</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            {isOpen ? "You haven't checked out of this shift yet." : 'Total time worked'}
          </Text>
          {flags.length > 0 && (
            <View style={styles.chipRow}>
              {flags.map((flag) => (
                <Chip key={flag} compact>
                  {flag}
                </Chip>
              ))}
            </View>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.rowHeader}>
            <Text variant="labelLarge" style={styles.sectionLabel}>
              Check in
            </Text>
            <Text variant="titleMedium" style={styles.rowValue}>
              {dateTime(record.check_in_at)}
            </Text>
          </View>
          <Text variant="bodyMedium" style={styles.address}>
            {record.check_in_address ?? 'No address recorded.'}
          </Text>
          {checkInCoords && (
            <PaperButton
              mode="outlined"
              icon="map-marker-outline"
              textColor={theme.colors.onSurface}
              onPress={() => openInMaps(checkInCoords)}
              style={styles.mapButton}
            >
              View on map
            </PaperButton>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.rowHeader}>
            <Text variant="labelLarge" style={styles.sectionLabel}>
              Check out
            </Text>
            {!isOpen && (
              <Text variant="titleMedium" style={styles.rowValue}>
                {dateTime(record.check_out_at!)}
              </Text>
            )}
          </View>
          {isOpen ? (
            <Text variant="bodyMedium" style={styles.address}>
              Not checked out yet.
            </Text>
          ) : (
            <>
              <Text variant="bodyMedium" style={styles.address}>
                {record.check_out_address ?? 'No address recorded.'}
              </Text>
              {checkOutCoords && (
                <PaperButton
                  mode="outlined"
                  icon="map-marker-outline"
                  textColor={theme.colors.onSurface}
                  onPress={() => openInMaps(checkOutCoords)}
                  style={styles.mapButton}
                >
                  View on map
                </PaperButton>
              )}
              {checkOutNote && (
                <View style={styles.noteRow}>
                  <Chip
                    compact
                    icon={record.check_out_type === 'auto_geofence' ? 'map-marker-radius-outline' : 'account-check-outline'}
                    style={{
                      backgroundColor: record.check_out_type === 'auto_geofence' ? statusColors.warning : statusColors.neutral,
                    }}
                    textStyle={styles.noteChipText}
                  >
                    {record.check_out_type === 'auto_geofence' ? 'Auto checkout' : 'Admin correction'}
                  </Chip>
                  <Text variant="bodySmall" style={styles.noteText}>
                    {checkOutNote}
                  </Text>
                </View>
              )}
            </>
          )}
        </Card.Content>
      </Card>

      <Portal>
        <Dialog visible={deleteConfirmVisible} onDismiss={() => setDeleteConfirmVisible(false)}>
          <Dialog.Title>Delete this attendance record?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">This can't be undone.</Text>
            {deleteError && (
              <Text variant="bodySmall" style={styles.deleteError}>
                {deleteError}
              </Text>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <PaperButton onPress={() => setDeleteConfirmVisible(false)} disabled={deleting}>
              Cancel
            </PaperButton>
            <PaperButton onPress={confirmDelete} loading={deleting} disabled={deleting}>
              Delete
            </PaperButton>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  date: {
    marginBottom: 12,
    opacity: 0.7,
  },
  card: {
    marginBottom: 12,
  },
  durationContent: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  subtitle: {
    marginTop: 4,
    opacity: 0.7,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    justifyContent: 'center',
  },
  rowHeader: {
    marginBottom: 8,
  },
  sectionLabel: {
    opacity: 0.6,
  },
  rowValue: {
    marginTop: 2,
  },
  address: {
    marginBottom: 12,
  },
  mapButton: {
    alignSelf: 'flex-start',
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  noteChipText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  noteText: {
    flex: 1,
    opacity: 0.7,
  },
  deleteError: {
    marginTop: 8,
    color: statusColors.danger,
  },
});
