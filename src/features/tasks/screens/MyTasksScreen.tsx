import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { AppFilterButton } from '@/components/AppFilterButton';
import { AppFilterSheet } from '@/components/AppFilterSheet';
import { EmptyState, ErrorState, LoadingState, NotConfiguredState } from '@/components/ScreenState';
import { isSupabaseConfigured } from '@/services/supabase';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { TaskCard } from '../components/TaskCard';
import { useMyTasks } from '../hooks/useMyTasks';
import { TASK_FILTER_OPTIONS, matchesAnyTaskFilter, sortTasks, type TaskFilterValue } from '../types';

export function MyTasksScreen() {
  const { profile } = useAuth();
  const { tasks, loading, error, updatingId, setStatus, reload } = useMyTasks(profile?.id);
  const [filters, setFilters] = useState<TaskFilterValue[]>([]);
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);

  // Same shape as the admin overview's own filter+sort — found missing
  // here during a task-feature audit: every other list screen in this app
  // (Attendance, Leave, the admin Tasks overview) already got filtering,
  // this one never did, despite growing the same way.
  const visibleTasks = useMemo(() => sortTasks(tasks.filter((t) => matchesAnyTaskFilter(t, filters))), [tasks, filters]);

  if (!isSupabaseConfigured) return <NotConfiguredState />;
  if (loading) return <LoadingState label="Loading your tasks…" />;
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
          <EmptyState message={tasks.length === 0 ? 'No tasks assigned to you yet.' : 'No tasks match this filter.'} />
        }
        renderItem={({ item }) => (
          <TaskCard
            task={item}
            assignerName={item.assigner?.name}
            busy={updatingId === item.id}
            onStatusChange={(status) => setStatus(item.id, status)}
          />
        )}
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
