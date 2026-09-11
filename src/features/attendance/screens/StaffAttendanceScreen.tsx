import { useState } from 'react';
import { FlatList, RefreshControl, SectionList, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Dialog,
  HelperText,
  Portal,
  Text,
  useTheme,
} from 'react-native-paper';
import { AppSegmentedButtons } from '@/components/AppSegmentedButtons';
import { EmptyState, ErrorState, LoadingState, NotConfiguredState } from '@/components/ScreenState';
import { isSupabaseConfigured } from '@/services/supabase';
import { groupByDay } from '@/lib/groupByDay';
import { AttendanceHistoryRow } from '../components/AttendanceHistoryRow';
import { useExportAttendance } from '../hooks/useExportAttendance';
import { useStaffAttendance } from '../hooks/useStaffAttendance';
import type { AttendanceWithEmployee } from '../types';

export function StaffAttendanceScreen() {
  const theme = useTheme();
  const { checkedIn, history, loading, loadingMore, hasMoreHistory, error, closingId, closeOutRecord, loadMoreHistory, reload } =
    useStaffAttendance();
  const { exporting, error: exportError, exportCsv } = useExportAttendance();
  const [pendingRecord, setPendingRecord] = useState<AttendanceWithEmployee | null>(null);
  const [tab, setTab] = useState<'checkedIn' | 'history'>('checkedIn');

  if (!isSupabaseConfigured) return <NotConfiguredState />;
  if (loading) return <LoadingState label="Loading staff attendance…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  async function confirmCheckOut() {
    if (!pendingRecord) return;
    await closeOutRecord(pendingRecord.id);
    setPendingRecord(null);
  }

  return (
    <>
      <View style={styles.topBar}>
        <Button
          mode="outlined"
          icon="file-export-outline"
          onPress={exportCsv}
          loading={exporting}
          disabled={exporting}
          style={styles.exportButton}
        >
          Export attendance (CSV)
        </Button>
        {exportError && (
          <HelperText type="error" style={styles.exportError}>
            {exportError}
          </HelperText>
        )}

        <AppSegmentedButtons
          value={tab}
          onValueChange={(v) => setTab(v as typeof tab)}
          style={styles.tabs}
          buttons={[
            { value: 'checkedIn', label: `Checked in (${checkedIn.length})` },
            { value: 'history', label: 'Recent history' },
          ]}
        />
      </View>

      {tab === 'checkedIn' ? (
        <FlatList
          data={checkedIn}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={false} onRefresh={reload} />}
          ListEmptyComponent={<EmptyState message="No one is checked in right now." />}
          renderItem={({ item }) => (
            <AttendanceHistoryRow
              record={item}
              showEmployee
              closing={closingId === item.id}
              onRequestCheckOut={setPendingRecord}
            />
          )}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <SectionList
          sections={groupByDay(history)}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={false} onRefresh={reload} />}
          onEndReached={loadMoreHistory}
          onEndReachedThreshold={0.5}
          stickySectionHeadersEnabled
          renderSectionHeader={({ section }) => (
            <View style={[styles.sectionHeader, { backgroundColor: theme.colors.background }]}>
              <Text variant="titleSmall">{section.title}</Text>
              <Text variant="bodySmall" style={styles.sectionCount}>
                {section.data.length} {section.data.length === 1 ? 'record' : 'records'}
              </Text>
            </View>
          )}
          ListEmptyComponent={<EmptyState message="No attendance records yet." />}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator style={styles.footerSpinner} />
            ) : !hasMoreHistory && history.length > 0 ? (
              <Text style={styles.footerEndText}>You've reached the beginning of the record.</Text>
            ) : null
          }
          renderItem={({ item }) => (
            <AttendanceHistoryRow
              record={item}
              showEmployee
              closing={closingId === item.id}
              onRequestCheckOut={setPendingRecord}
            />
          )}
          contentContainerStyle={styles.listContent}
        />
      )}

      <Portal>
        <Dialog visible={pendingRecord !== null} onDismiss={() => setPendingRecord(null)}>
          <Dialog.Title>Check out {pendingRecord?.employees?.name}?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              This records their checkout at the current time, marked as an admin correction. Use this if they
              forgot to check out themselves.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPendingRecord(null)}>Cancel</Button>
            <Button onPress={confirmCheckOut} loading={closingId === pendingRecord?.id}>
              Check out
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  exportButton: {
    marginBottom: 12,
  },
  exportError: {
    marginTop: -8,
    marginBottom: 8,
  },
  tabs: {
    marginBottom: 4,
  },
  listContent: {
    paddingBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  sectionCount: {
    opacity: 0.6,
  },
  footerSpinner: {
    marginVertical: 20,
  },
  footerEndText: {
    textAlign: 'center',
    marginVertical: 20,
    opacity: 0.5,
  },
});
