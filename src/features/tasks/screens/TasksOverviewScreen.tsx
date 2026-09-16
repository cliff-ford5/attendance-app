import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { AppFilterButton } from '@/components/AppFilterButton';
import { AppFilterSheet } from '@/components/AppFilterSheet';
import { EmptyState, ErrorState, LoadingState, NotConfiguredState } from '@/components/ScreenState';
import { isSupabaseConfigured } from '@/services/supabase';
import { TaskCard } from '../components/TaskCard';
import { useAllTasks } from '../hooks/useAllTasks';
import { TASK_FILTER_OPTIONS, matchesAnyTaskFilter, sortTasks, type TaskFilterValue } from '../types';

// Read-only overview across all staff — assigning a task now happens from
// that employee's own profile (features/staff/screens/StaffProfileScreen),
// not from a picker here.
export function TasksOverviewScreen() {
  const { tasks, loading, error, reload } = useAllTasks();
  const [filters, setFilters] = useState<TaskFilterValue[]>([]);
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);

  // Same "get everything, filter/sort client-side" pattern already used
  // throughout this app (admin dashboard stats, staff attendance) rather
  // than a dedicated filtered query — internal-tool data volume, and the
  // full list is already fetched either way. sortTasks (shared with
  // MyTasksScreen) puts not-done work first (overdue surfaced first among
  // those), completed tasks last — previously this only re-sorted overdue
  // first and left done tasks mixed into the plain deadline order, where a
  // long-completed task's stale deadline could sort it ahead of real
  // upcoming work.
  const visibleTasks = useMemo(() => sortTasks(tasks.filter((t) => matchesAnyTaskFilter(t, filters))), [tasks, filters]);

  if (!isSupabaseConfigured) return <NotConfiguredState />;
  if (loading) return <LoadingState label="Loading tasks…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <>
      <FlatList
        data={visibleTasks}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={false} onRefresh={reload} />}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.filterRow}>
            <AppFilterButton activeCount={filters.length} onPress={() => setFilterSheetVisible(true)} />
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            message={
              tasks.length === 0
                ? 'No tasks assigned yet — assign one from an employee’s profile.'
                : 'No tasks match this filter.'
            }
          />
        }
        renderItem={({ item }) => <TaskCard task={item} assigneeName={item.assignee?.name} />}
      />
      <AppFilterSheet
        visible={filterSheetVisible}
        onDismiss={() => setFilterSheetVisible(false)}
        title="Filter tasks"
        options={TASK_FILTER_OPTIONS}
        selected={filters}
        onApply={(next) => setFilters(next as TaskFilterValue[])}
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
