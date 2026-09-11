import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { List, Searchbar, useTheme } from 'react-native-paper';
import { AppAvatar } from '@/components/AppAvatar';
import { AppSegmentedButtons } from '@/components/AppSegmentedButtons';
import { EmptyState, ErrorState, LoadingState, NotConfiguredState } from '@/components/ScreenState';
import { isSupabaseConfigured } from '@/services/supabase';
import { statusColors } from '@/constants/theme';
import { DashboardStatCard } from '../components/DashboardStatCard';
import { useAdminDashboard } from '../hooks/useAdminDashboard';
import { useStaffList } from '../hooks/useStaffList';

export function StaffListScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { employees, loading, error, reload } = useStaffList();
  const { stats, loading: loadingStats, error: statsError, reload: reloadStats } = useAdminDashboard();
  const [tab, setTab] = useState<'dashboard' | 'staff'>('dashboard');
  const [query, setQuery] = useState('');

  // Client-side — same "get everything, filter locally" pattern as the
  // rest of this app's admin screens, fine at this data volume. Matches
  // name, position, or department so "search for a role" works too, not
  // just a literal name lookup.
  const filteredEmployees = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) =>
      [e.name, e.position, e.department].some((field) => field?.toLowerCase().includes(q))
    );
  }, [employees, query]);

  if (!isSupabaseConfigured) return <NotConfiguredState />;

  return (
    <View style={styles.screen}>
      <AppSegmentedButtons
        value={tab}
        onValueChange={(v) => setTab(v as typeof tab)}
        style={styles.tabs}
        buttons={[
          { value: 'dashboard', label: 'Dashboard' },
          { value: 'staff', label: `Staff (${employees.length})` },
        ]}
      />

      {tab === 'dashboard' ? (
        loadingStats ? (
          <LoadingState label="Loading dashboard…" />
        ) : statsError ? (
          <ErrorState message={statsError} onRetry={reloadStats} />
        ) : (
          stats && (
            <View style={styles.dashboard}>
              <View style={styles.dashboardRow}>
                <DashboardStatCard
                  label="Checked in now"
                  value={stats.checkedInNow}
                  icon="login"
                  color={statusColors.success}
                  onPress={() => router.push('/(admin)/attendance')}
                />
                <DashboardStatCard
                  label="Late today"
                  value={stats.lateToday}
                  icon="clock-alert-outline"
                  color={statusColors.warning}
                  onPress={() => router.push('/(admin)/attendance')}
                />
              </View>
              <View style={styles.dashboardRow}>
                <DashboardStatCard
                  label="On leave today"
                  value={stats.onLeaveToday}
                  icon="airplane-takeoff"
                  color={statusColors.neutral}
                  onPress={() => router.push('/(admin)/leave')}
                />
                <DashboardStatCard
                  label="Pending leave requests"
                  value={stats.pendingLeaveRequests}
                  icon="clipboard-clock-outline"
                  color={theme.colors.primary}
                  onPress={() => router.push('/(admin)/leave')}
                />
              </View>
              <View style={styles.dashboardRow}>
                <DashboardStatCard
                  label="Overdue tasks"
                  value={stats.overdueTasks}
                  icon="alert-circle-outline"
                  color={statusColors.danger}
                  onPress={() => router.push('/(admin)/tasks')}
                />
              </View>
            </View>
          )
        )
      ) : loading ? (
        <LoadingState label="Loading staff…" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <FlatList
          data={filteredEmployees}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={false} onRefresh={reload} />}
          ListHeaderComponent={
            <Searchbar
              placeholder="Search staff"
              value={query}
              onChangeText={setQuery}
              style={styles.searchbar}
              elevation={0}
            />
          }
          ListEmptyComponent={
            <EmptyState message={employees.length === 0 ? 'No employees yet.' : 'No staff match this search.'} />
          }
          renderItem={({ item }) => (
            <List.Item
              title={item.name}
              description={item.position || item.department || item.email}
              left={(props) => <AppAvatar name={item.name} avatarPath={item.avatar_path} style={props.style} />}
              onPress={() => router.push(`/(admin)/staff/${item.id}`)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  tabs: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
  },
  dashboard: {
    padding: 16,
    gap: 12,
  },
  dashboardRow: {
    flexDirection: 'row',
    gap: 12,
  },
  searchbar: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
  },
});
