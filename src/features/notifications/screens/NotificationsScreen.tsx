import { Stack, useRouter } from 'expo-router';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { Icon, List, Text, useTheme, Button as PaperButton } from 'react-native-paper';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState, ErrorState, LoadingState, NotConfiguredState } from '@/components/ScreenState';
import { isSupabaseConfigured } from '@/services/supabase';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import type { Notification, NotificationType } from '@/types/database';

const TYPE_ICON: Record<NotificationType, string> = {
  task_assigned: 'clipboard-list-outline',
  leave_decided: 'airplane-takeoff',
  leave_submitted: 'airplane-takeoff',
};

// Where tapping a notification actually goes — deliberately by type + the
// viewer's own role, not a stored deep-link, since there's no per-record
// detail route to land on for a task on the employee side (MyTasksScreen
// is a flat list, no drill-in), and admin leave review already defaults to
// "Pending" on its own tab (see leave feature's own filter default).
function targetForNotification(type: NotificationType, isAdmin: boolean): string {
  if (type === 'task_assigned') return isAdmin ? '/(admin)/tasks' : '/(employee)/tasks';
  return isAdmin ? '/(admin)/leave' : '/(employee)/leave';
}

export function NotificationsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { profile } = useAuth();
  const isAdmin = profile?.role !== 'employee';
  const { notifications, loading, loadingMore, hasMore, loadMore, error, markAsRead, markAllAsRead, markingAllRead, reload } =
    useNotifications(profile?.id);

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  function handlePress(notification: Notification) {
    if (!notification.read_at) markAsRead(notification.id);
    // Expo Router's typed routes only accept string literals it can
    // statically enumerate — a dynamically-computed path needs the same
    // escape hatch AppTabBarIcon.tsx already uses for the same reason.
    router.push(targetForNotification(notification.type, isAdmin) as never);
  }

  if (!isSupabaseConfigured)
    return (
      <>
        <Stack.Screen options={{ header: () => <AppHeader title="Notifications" onBack={() => router.back()} /> }} />
        <NotConfiguredState />
      </>
    );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          header: () => (
            <AppHeader
              title="Notifications"
              onBack={() => router.back()}
              actions={
                unreadCount > 0
                  ? [{ icon: 'check-all', onPress: markAllAsRead, accessibilityLabel: 'Mark all as read' }]
                  : undefined
              }
            />
          ),
        }}
      />

      {loading ? (
        <LoadingState label="Loading notifications…" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={false} onRefresh={reload} />}
          ListEmptyComponent={<EmptyState message="No notifications yet." />}
          renderItem={({ item }) => (
            <List.Item
              title={item.title}
              description={item.body}
              descriptionNumberOfLines={2}
              style={!item.read_at ? { backgroundColor: theme.colors.primaryContainer } : undefined}
              left={(props) => <Icon {...props} source={TYPE_ICON[item.type]} size={24} />}
              right={
                !item.read_at
                  ? (props) => <View {...props} style={[props.style, styles.unreadDot, { backgroundColor: theme.colors.primary }]} />
                  : undefined
              }
              onPress={() => handlePress(item)}
            />
          )}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <LoadingState label="Loading more…" />
            ) : !hasMore && notifications.length > 0 ? (
              <Text style={styles.emptyFooter}>No more notifications.</Text>
            ) : null
          }
        />
      )}

      {markingAllRead && (
        <PaperButton mode="text" disabled loading style={styles.markingIndicator}>
          Marking all as read…
        </PaperButton>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    alignSelf: 'center',
    marginRight: 8,
  },
  emptyFooter: {
    textAlign: 'center',
    paddingVertical: 16,
    opacity: 0.6,
  },
  markingIndicator: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
  },
});
