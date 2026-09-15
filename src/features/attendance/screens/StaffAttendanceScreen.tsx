import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Platform, RefreshControl, SectionList, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Dialog,
  HelperText,
  Portal,
  Text,
  useTheme,
} from 'react-native-paper';
import { AppFilterButton } from '@/components/AppFilterButton';
import { AppFilterSheet } from '@/components/AppFilterSheet';
import { AppSegmentedButtons } from '@/components/AppSegmentedButtons';
import { EmptyState, ErrorState, LoadingState, NotConfiguredState } from '@/components/ScreenState';
import { isSupabaseConfigured } from '@/services/supabase';
import { openAndroidDatePicker } from '@/lib/androidDateTimePicker';
import { groupByDay } from '@/lib/groupByDay';
import { AttendanceHistoryRow } from '../components/AttendanceHistoryRow';
import { useExportAttendance } from '../hooks/useExportAttendance';
import { useStaffAttendance } from '../hooks/useStaffAttendance';
import type { AttendanceHistoryFlag } from '../services/attendanceService';
import type { AttendanceWithEmployee } from '../types';

const HISTORY_FILTER_OPTIONS: { value: AttendanceHistoryFlag; label: string }[] = [
  { value: 'late', label: 'Late' },
  { value: 'leftEarly', label: 'Left early' },
  { value: 'halfDay', label: 'Half day' },
  { value: 'autoCheckout', label: 'Auto checkout' },
];

export function StaffAttendanceScreen() {
  const theme = useTheme();
  const router = useRouter();
  const {
    checkedIn,
    history,
    historyFlags,
    setHistoryFlags,
    loading,
    loadingMore,
    hasMoreHistory,
    error,
    closingId,
    closeOutRecord,
    loadMoreHistory,
    reload,
  } = useStaffAttendance();
  const { exporting, error: exportError, exportCsv, startDate, setStartDate, endDate, setEndDate } = useExportAttendance();
  const [pendingRecord, setPendingRecord] = useState<AttendanceWithEmployee | null>(null);
  const [tab, setTab] = useState<'checkedIn' | 'history'>('checkedIn');
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [exportDialogVisible, setExportDialogVisible] = useState(false);
  const [exportPickerFor, setExportPickerFor] = useState<'start' | 'end' | null>(null);

  if (!isSupabaseConfigured) return <NotConfiguredState />;
  if (loading) return <LoadingState label="Loading staff attendance…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  async function confirmCheckOut() {
    if (!pendingRecord) return;
    await closeOutRecord(pendingRecord.id);
    setPendingRecord(null);
  }

  function applyExportDate(which: 'start' | 'end', selected: Date) {
    if (which === 'start') {
      setStartDate(selected);
      if (selected > endDate) setEndDate(selected);
    } else {
      setEndDate(selected);
    }
  }

  function openExportPickerFor(which: 'start' | 'end') {
    if (Platform.OS === 'android') {
      openAndroidDatePicker(which === 'start' ? startDate : endDate, (selected) => applyExportDate(which, selected), which === 'end' ? startDate : undefined);
    } else {
      setExportPickerFor(which);
    }
  }

  async function handleExport() {
    const ok = await exportCsv();
    if (ok) setExportDialogVisible(false);
  }

  return (
    <>
      <View style={styles.topBar}>
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
              onPress={() => router.push(`/(admin)/attendance/${item.id}`)}
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
          ListHeaderComponent={
            <View style={styles.historyHeader}>
              <Button
                mode="outlined"
                icon="file-export-outline"
                onPress={() => setExportDialogVisible(true)}
                style={styles.exportButton}
              >
                Export attendance (CSV)
              </Button>

              <AppFilterButton activeCount={historyFlags.length} onPress={() => setFilterSheetVisible(true)} />
            </View>
          }
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
              onPress={() => router.push(`/(admin)/attendance/${item.id}`)}
            />
          )}
          contentContainerStyle={styles.listContent}
        />
      )}

      <AppFilterSheet
        visible={filterSheetVisible}
        onDismiss={() => setFilterSheetVisible(false)}
        title="Filter history"
        options={HISTORY_FILTER_OPTIONS}
        selected={historyFlags}
        onApply={(next) => setHistoryFlags(next as AttendanceHistoryFlag[])}
      />

      <Portal>
        <Dialog visible={exportDialogVisible} onDismiss={() => setExportDialogVisible(false)}>
          <Dialog.Title>Export attendance</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.exportHint}>
              Choose the date range to export — payroll periods are usually a month or less, not the whole
              history.
            </Text>
            <Button
              mode="outlined"
              icon="calendar-outline"
              textColor={theme.colors.onSurface}
              onPress={() => openExportPickerFor('start')}
              style={styles.exportDateButton}
            >
              From: {startDate.toLocaleDateString()}
            </Button>
            <Button
              mode="outlined"
              icon="calendar-outline"
              textColor={theme.colors.onSurface}
              onPress={() => openExportPickerFor('end')}
              style={styles.exportDateButton}
            >
              To: {endDate.toLocaleDateString()}
            </Button>
            {exportPickerFor && Platform.OS !== 'android' && (
              <DateTimePicker
                value={exportPickerFor === 'start' ? startDate : endDate}
                mode="date"
                minimumDate={exportPickerFor === 'end' ? startDate : undefined}
                onChange={(_, selected) => {
                  const activeFor = exportPickerFor;
                  setExportPickerFor(Platform.OS === 'ios' ? activeFor : null);
                  if (selected) applyExportDate(activeFor, selected);
                }}
              />
            )}
            {exportError && <HelperText type="error">{exportError}</HelperText>}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setExportDialogVisible(false)} disabled={exporting}>
              Cancel
            </Button>
            <Button onPress={handleExport} loading={exporting} disabled={exporting}>
              Export
            </Button>
          </Dialog.Actions>
        </Dialog>

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
  historyHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  exportButton: {
    marginBottom: 12,
  },
  exportHint: {
    marginBottom: 12,
    opacity: 0.8,
  },
  exportDateButton: {
    marginBottom: 12,
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
