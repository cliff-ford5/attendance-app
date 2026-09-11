import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { AppFilterChip } from '@/components/AppFilterChip';
import { EmptyState, ErrorState, LoadingState, NotConfiguredState } from '@/components/ScreenState';
import { isSupabaseConfigured } from '@/services/supabase';
import { TaskCard } from '../components/TaskCard';
import { useAllTasks } from '../hooks/useAllTasks';
import { isOverdue, type TaskStatus, type TaskWithAssignee } from '../types';

type TaskFilter = 'all' | TaskStatus | 'overdue';

const FILTERS: { value: TaskFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'done', label: 'Done' },
];

function matchesFilter(task: TaskWithAssignee, filter: TaskFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'overdue') return isOverdue(task);
  return task.status === filter;
}

// Read-only overview across all staff — assigning a task now happens from
// that employee's own profile (features/staff/screens/StaffProfileScreen),
// not from a picker here.
export function TasksOverviewScreen() {
  const { tasks, loading, error, reload } = useAllTasks();
  const [filter, setFilter] = useState<TaskFilter>('all');

  // Same "get everything, filter/sort client-side" pattern already used
  // throughout this app (admin dashboard stats, staff attendance) rather
  // than a dedicated filtered query — internal-tool data volume, and the
  // full list is already fetched either way. Overdue tasks surface first
  // regardless of filter, since those are the ones actually needing
  // attention; everything else stays in the service's own deadline order.
  const filteredTasks = useMemo(() => {
    const matching = tasks.filter((t) => matchesFilter(t, filter));
    return [...matching].sort((a, b) => Number(isOverdue(b)) - Number(isOverdue(a)));
  }, [tasks, filter]);

  if (!isSupabaseConfigured) return <NotConfiguredState />;
  if (loading) return <LoadingState label="Loading tasks…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <FlatList
      data={filteredTasks}
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
