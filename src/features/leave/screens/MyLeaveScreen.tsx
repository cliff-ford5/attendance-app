import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Button, Dialog, FAB, Portal, Text } from 'react-native-paper';
import { AppSegmentedButtons } from '@/components/AppSegmentedButtons';
import { EmptyState, ErrorState, LoadingState, NotConfiguredState } from '@/components/ScreenState';
import { isSupabaseConfigured } from '@/services/supabase';
import { statusColors } from '@/constants/theme';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { toDateOnly } from '@/lib/dateOnly';
import { LeaveRequestCard } from '../components/LeaveRequestCard';
import { LeaveStatCard } from '../components/LeaveStatCard';
import { useLeaveBalance } from '../hooks/useLeaveBalance';
import { useMyLeaveRequests } from '../hooks/useMyLeaveRequests';
import type { LeaveRequest } from '../types';

export function MyLeaveScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { requests, loading, error, cancellingId, cancel, deletingId, remove, reload } = useMyLeaveRequests(profile?.id);
  const { balance, loading: loadingBalance } = useLeaveBalance(profile?.id);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [pendingDelete, setPendingDelete] = useState<LeaveRequest | null>(null);

  async function confirmDelete() {
    if (!pendingDelete) return;
    const ok = await remove(pendingDelete.id);
    if (ok) setPendingDelete(null);
  }

  const counts = {
    approved: requests.filter((r) => r.status === 'approved').length,
    pending: requests.filter((r) => r.status === 'pending').length,
    rejected: requests.filter((r) => r.status === 'rejected').length,
  };

  const todayStr = toDateOnly(new Date());
  const visibleRequests = requests.filter((r) => (tab === 'upcoming' ? r.end_date >= todayStr : r.end_date < todayStr));

  if (!isSupabaseConfigured) return <NotConfiguredState />;

  return (
    <View style={styles.flex}>
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
            deleting={deletingId === item.id}
            onCancel={item.status === 'pending' ? () => cancel(item.id) : undefined}
            onEdit={item.status === 'pending' ? () => router.push({ pathname: '/(employee)/leave/new', params: { id: item.id } }) : undefined}
            onDelete={
              item.status === 'pending' || item.status === 'cancelled' ? () => setPendingDelete(item) : undefined
            }
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
      <FAB icon="plus" label="Request time off" style={styles.fab} onPress={() => router.push('/(employee)/leave/new')} />

      <Portal>
        <Dialog visible={pendingDelete !== null} onDismiss={() => setPendingDelete(null)}>
          <Dialog.Title>Delete this request?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">This can't be undone.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPendingDelete(null)}>Cancel</Button>
            <Button onPress={confirmDelete} loading={deletingId === pendingDelete?.id}>
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 16,
  },
  tabs: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
  },
  listContent: {
    paddingBottom: 96,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
});
