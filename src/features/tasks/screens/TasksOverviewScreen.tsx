import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { AppFilterButton } from '@/components/AppFilterButton';
import { AppFilterSheet } from '@/components/AppFilterSheet';
import { EmptyState, ErrorState, LoadingState, NotConfiguredState } from '@/components/ScreenState';
import { isSupabaseConfigured } from '@/services/supabase';
import { TaskCard } from '../components/TaskCard';
import { useAllTasks } from '../hooks/useAllTasks';
import { isOverdue, type TaskWithAssignee } from '../types';

// "Overdue" is a computed flag (deadline passed, not done yet), not a real
// status value — a task can be both "Assigned" and "Overdue" at once, so
// this was never actually a single-select-shaped field. Multi-select
// AppFilterSheet's checkboxes match what the data really is;
// the old single-select chips just happened to work by accident since
// "Overdue" was rarely combined with a real status in practice.
type TaskFilterValue = 'overdue' | 'assigned' | 'in_progress' | 'done';

const TASK_FILTER_OPTIONS: { value: TaskFilterValue; label: string }[] = [
  { value: 'overdue', label: 'Overdue' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'done', label: 'Done' },
];

function matchesAnyFilter(task: TaskWithAssignee, filters: TaskFilterValue[]): boolean {
  if (filters.length === 0) return true;
  return filters.some((f) => (f === 'overdue' ? isOverdue(task) : task.status === f));
}

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
  // full list is already fetched either way. Overdue tasks surface first
  // regardless of filter, since those are the ones actually needing
  // attention; everything else stays in the service's own deadline order.
  const filteredTasks = useMemo(() => {
    const matching = tasks.filter((t) => matchesAnyFilter(t, filters));
    return [...matching].sort((a, b) => Number(isOverdue(b)) - Number(isOverdue(a)));
  }, [tasks, filters]);

  if (!isSupabaseConfigured) return <NotConfiguredState />;
  if (loading) return <LoadingState label="Loading tasks…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <>
      <FlatList
        data={filteredTasks}
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
