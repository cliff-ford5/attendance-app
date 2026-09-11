import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, SectionList, StyleSheet, View } from 'react-native';
import { Divider, List, Text, useTheme } from 'react-native-paper';
import { EmptyState, ErrorState, LoadingState, NotConfiguredState } from '@/components/ScreenState';
import { isSupabaseConfigured } from '@/services/supabase';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { groupByDay } from '@/lib/groupByDay';
import { AttendanceHistoryRow } from '../components/AttendanceHistoryRow';
import { WeeklyTimesheetGrid } from '../components/WeeklyTimesheetGrid';
import { useMyAttendanceHistory } from '../hooks/useMyAttendanceHistory';
import type { AttendanceRecord } from '../types';

const HIGHLIGHT_MS = 1500;

export function MyAttendanceScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { profile } = useAuth();
  const { records, loading, loadingMore, hasMore, loadMore, error, reload } = useMyAttendanceHistory(profile?.id);
  const sectionListRef = useRef<SectionList<AttendanceRecord>>(null);
  const [highlightedKey, setHighlightedKey] = useState<string | null>(null);
  const highlightTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sections = useMemo(() => groupByDay(records), [records]);

  if (!isSupabaseConfigured) return <NotConfiguredState />;
  if (loading) return <LoadingState label="Loading your attendance…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  // Jumps the list below to that day's section and flashes it, instead of
  // navigating away — the grid is a compact overview of the same list, not
  // a separate destination, so tapping it should feel like "look, right
  // here" rather than opening a new screen for information the list
  // already has once you're pointed at it. Only ever works for a day
  // within the currently loaded page(s) — same known limitation the grid
  // itself already documents.
  function handleDayPress(recordId: string) {
    const sectionIndex = sections.findIndex((s) => s.data.some((r) => r.id === recordId));
    if (sectionIndex === -1) return;
    sectionListRef.current?.scrollToLocation({ sectionIndex, itemIndex: 0, viewPosition: 0.1, animated: true });
    setHighlightedKey(sections[sectionIndex].key);
    if (highlightTimeout.current) clearTimeout(highlightTimeout.current);
    highlightTimeout.current = setTimeout(() => setHighlightedKey(null), HIGHLIGHT_MS);
  }

  const header = (
    <View>
      <WeeklyTimesheetGrid records={records} onDayPress={handleDayPress} />
      <Divider />
      <List.Item
        title="My schedule"
        description="Set the days and hours you normally work"
        left={(props) => <List.Icon {...props} icon="calendar-week-outline" />}
        right={(props) => <List.Icon {...props} icon="chevron-right" />}
        onPress={() => router.push('/(employee)/schedule')}
      />
      <Divider />
    </View>
  );

  if (records.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        {header}
        <EmptyState message="No attendance history yet." />
      </View>
    );
  }

  return (
    <SectionList
      ref={sectionListRef}
      sections={sections}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={false} onRefresh={reload} />}
      ListHeaderComponent={header}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      onScrollToIndexFailed={() => {}}
      renderSectionHeader={({ section }) => (
        <View
          style={[
            styles.sectionHeader,
            { backgroundColor: theme.colors.background },
            section.key === highlightedKey && { backgroundColor: theme.colors.primaryContainer },
          ]}
        >
          <Text variant="titleSmall">{section.title}</Text>
        </View>
      )}
      renderItem={({ item }) => (
        <AttendanceHistoryRow record={item} onPress={() => router.push(`/(employee)/attendance/${item.id}`)} />
      )}
      ListFooterComponent={
        loadingMore ? (
          <ActivityIndicator style={styles.footerSpinner} />
        ) : !hasMore ? (
          <Text style={styles.footerEndText}>No more records.</Text>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  footerSpinner: {
    marginVertical: 20,
  },
  footerEndText: {
    textAlign: 'center',
    marginVertical: 20,
    opacity: 0.5,
  },
});
