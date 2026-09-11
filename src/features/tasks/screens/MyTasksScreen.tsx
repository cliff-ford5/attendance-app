import { FlatList, RefreshControl } from 'react-native';
import { EmptyState, ErrorState, LoadingState, NotConfiguredState } from '@/components/ScreenState';
import { isSupabaseConfigured } from '@/services/supabase';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { TaskCard } from '../components/TaskCard';
import { useMyTasks } from '../hooks/useMyTasks';
import type { TaskStatus } from '../types';

export function MyTasksScreen() {
  const { profile } = useAuth();
  const { tasks, loading, error, updatingId, setStatus, reload } = useMyTasks(profile?.id);

  if (!isSupabaseConfigured) return <NotConfiguredState />;
  if (loading) return <LoadingState label="Loading your tasks…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (tasks.length === 0) return <EmptyState message="No tasks assigned to you yet." />;

  function nextStatus(current: TaskStatus): TaskStatus {
    return current === 'assigned' ? 'in_progress' : 'done';
  }

  return (
    <FlatList
      data={tasks}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={false} onRefresh={reload} />}
      contentContainerStyle={{ paddingVertical: 8 }}
      renderItem={({ item }) => (
        <TaskCard
          task={item}
          busy={updatingId === item.id}
          onAdvance={item.status === 'done' ? undefined : () => setStatus(item.id, nextStatus(item.status))}
        />
      )}
    />
  );
}
