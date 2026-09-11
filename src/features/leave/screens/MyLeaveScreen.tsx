import DateTimePicker from '@react-native-community/datetimepicker';
import { useMemo, useState } from 'react';
import { FlatList, Platform, StyleSheet, View } from 'react-native';
import { Button, Card, HelperText, Text, useTheme } from 'react-native-paper';
import { AppSegmentedButtons } from '@/components/AppSegmentedButtons';
import { AppTextInput as TextInput } from '@/components/AppTextInput';
import { EmptyState, ErrorState, LoadingState, NotConfiguredState } from '@/components/ScreenState';
import { isSupabaseConfigured } from '@/services/supabase';
import { statusColors } from '@/constants/theme';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { openAndroidDatePicker } from '@/lib/androidDateTimePicker';
import { toDateOnly } from '@/lib/dateOnly';
import type { LeaveType } from '@/types/database';
import { LeaveRequestCard } from '../components/LeaveRequestCard';
import { LeaveStatCard } from '../components/LeaveStatCard';
import { useCreateLeaveRequest } from '../hooks/useCreateLeaveRequest';
import { useLeaveBalance } from '../hooks/useLeaveBalance';
import { useMyLeaveRequests } from '../hooks/useMyLeaveRequests';

function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d;
}

export function MyLeaveScreen() {
  const theme = useTheme();
  const { profile } = useAuth();
  const { requests, loading, error, cancellingId, cancel, reload } = useMyLeaveRequests(profile?.id);
  const { create, submitting, error: createError } = useCreateLeaveRequest(profile?.id);
  const { balance, loading: loadingBalance } = useLeaveBalance(profile?.id);

  const [leaveType, setLeaveType] = useState<LeaveType>('vacation');
  const [startDate, setStartDate] = useState(tomorrow());
  const [endDate, setEndDate] = useState(tomorrow());
  const [reason, setReason] = useState('');
  const [pickerFor, setPickerFor] = useState<'start' | 'end' | null>(null);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  const counts = useMemo(
    () => ({
      approved: requests.filter((r) => r.status === 'approved').length,
      pending: requests.filter((r) => r.status === 'pending').length,
      rejected: requests.filter((r) => r.status === 'rejected').length,
    }),
    [requests]
  );

  const todayStr = toDateOnly(new Date());
  const visibleRequests = requests.filter((r) => (tab === 'upcoming' ? r.end_date >= todayStr : r.end_date < todayStr));

  if (!isSupabaseConfigured) return <NotConfiguredState />;

  function applyDate(which: 'start' | 'end', selected: Date) {
    if (which === 'start') {
      setStartDate(selected);
      if (selected > endDate) setEndDate(selected);
    } else {
      setEndDate(selected);
    }
  }

  function openPickerFor(which: 'start' | 'end') {
    if (Platform.OS === 'android') {
      openAndroidDatePicker(which === 'start' ? startDate : endDate, (selected) => applyDate(which, selected), which === 'end' ? startDate : undefined);
    } else {
      setPickerFor(which);
    }
  }

  async function handleSubmit() {
    const ok = await create({ leaveType, startDate, endDate, reason: reason.trim() });
    if (ok) {
      setReason('');
      reload();
    }
  }

  return (
    <FlatList
      data={visibleRequests}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <>
          {/* Silently omitted (not an ErrorState) if this fails to load —
              it's a nice-to-have summary, not core to submitting a request. */}
          {!loadingBalance && balance && (
            <View style={styles.statsGrid}>
              <LeaveStatCard label="Leave Balance" value={balance.remaining} color={statusColors.neutral} />
              <LeaveStatCard label="Leave Approved" value={counts.approved} color={statusColors.success} />
              <LeaveStatCard label="Leave Pending" value={counts.pending} color={statusColors.warning} />
              <LeaveStatCard label="Leave Rejected" value={counts.rejected} color={statusColors.danger} />
            </View>
          )}
          <Card style={styles.form}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.formTitle}>
                Request time off
              </Text>

              <AppSegmentedButtons
                value={leaveType}
                onValueChange={(v) => setLeaveType(v as LeaveType)}
                style={styles.input}
                buttons={[
                  { value: 'vacation', label: 'Vacation' },
                  { value: 'sick', label: 'Sick' },
                  // "Emergency" — the longest label among four equal-width
                  // segments (a tighter split than the 3-way one that
                  // actually truncated) — shortened just for this picker;
                  // request cards/history still say "Emergency" in full
                  // (LeaveRequestCard's own TYPE_LABEL map), same
                  // "short in the tight picker, full word elsewhere"
                  // pattern already used for the Staff Profile tabs.
                  { value: 'emergency', label: 'Urgent' },
                  { value: 'other', label: 'Other' },
                ]}
              />

              <Button
                mode="outlined"
                icon="calendar-outline"
                textColor={theme.colors.onSurface}
                onPress={() => openPickerFor('start')}
                style={styles.input}
              >
                From: {startDate.toLocaleDateString()}
              </Button>
              <Button
                mode="outlined"
                icon="calendar-outline"
                textColor={theme.colors.onSurface}
                onPress={() => openPickerFor('end')}
                style={styles.input}
              >
                To: {endDate.toLocaleDateString()}
              </Button>
              {pickerFor && Platform.OS !== 'android' && (
                <DateTimePicker
                  value={pickerFor === 'start' ? startDate : endDate}
                  mode="date"
                  minimumDate={pickerFor === 'end' ? startDate : undefined}
                  onChange={(_, selected) => {
                    const activeFor = pickerFor;
                    setPickerFor(Platform.OS === 'ios' ? activeFor : null);
                    if (selected) applyDate(activeFor, selected);
                  }}
                />
              )}

              <TextInput
                label="Reason (optional)"
                value={reason}
                onChangeText={setReason}
                multiline
                style={styles.input}
              />

              {createError && <HelperText type="error">{createError}</HelperText>}

              <Button mode="contained" onPress={handleSubmit} loading={submitting} disabled={submitting}>
                Submit request
              </Button>
            </Card.Content>
          </Card>

          <AppSegmentedButtons
            value={tab}
            onValueChange={(v) => setTab(v as typeof tab)}
            style={styles.tabs}
            buttons={[
              { value: 'upcoming', label: 'Upcoming' },
              { value: 'past', label: 'Past' },
            ]}
          />
        </>
      }
      renderItem={({ item }) => (
        <LeaveRequestCard
          request={item}
          busy={cancellingId === item.id}
          onCancel={item.status === 'pending' ? () => cancel(item.id) : undefined}
        />
      )}
      ListFooterComponent={
        loading ? (
          <LoadingState label="Loading your requests…" />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : visibleRequests.length === 0 ? (
          <EmptyState message={tab === 'upcoming' ? 'No upcoming leave requests.' : 'No past leave requests.'} />
        ) : null
      }
      contentContainerStyle={styles.listContent}
    />
  );
}

const styles = StyleSheet.create({
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 16,
  },
  form: {
    margin: 16,
  },
  formTitle: {
    marginBottom: 12,
  },
  input: {
    marginBottom: 12,
  },
  tabs: {
    marginHorizontal: 16,
    marginBottom: 4,
  },
  listContent: {
    paddingBottom: 24,
  },
});
