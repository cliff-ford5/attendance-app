import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { AppFilterChip } from '@/components/AppFilterChip';
import { EmptyState, ErrorState, LoadingState, NotConfiguredState } from '@/components/ScreenState';
import { isSupabaseConfigured } from '@/services/supabase';
import type { LeaveStatus } from '@/types/database';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { LeaveRequestCard } from '../components/LeaveRequestCard';
import { useAllLeaveRequests } from '../hooks/useAllLeaveRequests';

type LeaveFilter = 'all' | LeaveStatus;

const FILTERS: { value: LeaveFilter; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'all', label: 'All' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function LeaveApprovalsScreen() {
  const { profile } = useAuth();
  const { requests, loading, error, reviewingId, review, reload } = useAllLeaveRequests(profile?.id);
  // Defaults to "Pending" rather than "All" — this screen's actual job is
  // reviewing requests that need a decision, and mixing every request ever
  // (approved/rejected/cancelled included) made that harder to see at a
  // glance, not easier.
  const [filter, setFilter] = useState<LeaveFilter>('pending');

  const filteredRequests = useMemo(
    () => (filter === 'all' ? requests : requests.filter((r) => r.status === filter)),
    [requests, filter]
  );

  if (!isSupabaseConfigured) return <NotConfiguredState />;
  if (loading) return <LoadingState label="Loading leave requests…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <FlatList
      data={filteredRequests}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={false} onRefresh={reload} />}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={
        <View style={styles.filterRow}>
          {FILTERS.map((f) => (
            <AppFilterChip key={f.value} compact selected={filter === f.value} onPress={() => setFilter(f.value)} style={styles.filterChip}>
              {f.label}
            </AppFilterChip>
          ))}
        </View>
      }
      ListEmptyComponent={
        <EmptyState message={requests.length === 0 ? 'No leave requests yet.' : 'No requests match this filter.'} />
      }
      renderItem={({ item }) => (
        <LeaveRequestCard
          request={item}
          employeeName={item.employees?.name}
          busy={reviewingId === item.id}
          onApprove={item.status === 'pending' ? () => review(item.id, 'approved') : undefined}
          onReject={item.status === 'pending' ? () => review(item.id, 'rejected') : undefined}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingVertical: 8,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  filterChip: {
    marginBottom: 0,
  },
});
