import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { AppFilterButton } from '@/components/AppFilterButton';
import { AppFilterSheet } from '@/components/AppFilterSheet';
import { EmptyState, ErrorState, LoadingState, NotConfiguredState } from '@/components/ScreenState';
import { isSupabaseConfigured } from '@/services/supabase';
import type { LeaveStatus } from '@/types/database';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { LeaveRequestCard } from '../components/LeaveRequestCard';
import { useAllLeaveRequests } from '../hooks/useAllLeaveRequests';

// A leave request's own status is a single exclusive value, but that's a
// fact about the record, not the filter — an admin might still reasonably
// want "Approved + Rejected" (everything decided) or "Pending + Approved"
// (everything not rejected) in one view. Multi-select is strictly more
// capable than single-select here for the same cost, so mode="multi" like
// the other two, not "single" — being able to select one value at a time
// is just what multi-select looks like when only one box is checked.
const STATUS_OPTIONS: { value: LeaveStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function LeaveApprovalsScreen() {
  const { profile } = useAuth();
  const { requests, loading, error, reviewingId, review, reload } = useAllLeaveRequests(profile?.id);
  // Defaults to "Pending" rather than no filter — this screen's actual job
  // is reviewing requests that need a decision, and mixing every request
  // ever (approved/rejected/cancelled included) made that harder to see at
  // a glance, not easier.
  const [statusFilter, setStatusFilter] = useState<LeaveStatus[]>(['pending']);
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);

  const filteredRequests = useMemo(
    () => (statusFilter.length === 0 ? requests : requests.filter((r) => statusFilter.includes(r.status))),
    [requests, statusFilter]
  );

  if (!isSupabaseConfigured) return <NotConfiguredState />;
  if (loading) return <LoadingState label="Loading leave requests…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <>
      <FlatList
        data={filteredRequests}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={false} onRefresh={reload} />}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.filterRow}>
            <AppFilterButton activeCount={statusFilter.length} onPress={() => setFilterSheetVisible(true)} />
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
      <AppFilterSheet
        visible={filterSheetVisible}
        onDismiss={() => setFilterSheetVisible(false)}
        title="Filter by status"
        options={STATUS_OPTIONS}
        selected={statusFilter}
        onApply={(next) => setStatusFilter(next as LeaveStatus[])}
      />
    </>
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
});
