import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { IconButton, Text, useTheme } from 'react-native-paper';
import type { AttendanceRecord } from '../types';

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day)); // shift back to Monday
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDate(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatHours(minutes: number): string {
  if (minutes <= 0) return '–';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// Deliberately attributes a whole shift's duration to the calendar date it
// started on, even if it runs past midnight — a real but rare edge case
// (matches the same "don't over-engineer a rare boundary" call leave
// balance made for New Year's-spanning requests).
function minutesWorkedOn(records: AttendanceRecord[], date: Date): number {
  return records.reduce((sum, r) => {
    const checkIn = new Date(r.check_in_at);
    if (!isSameDate(checkIn, date)) return sum;
    const end = r.check_out_at ? new Date(r.check_out_at) : new Date();
    return sum + Math.max(0, (end.getTime() - checkIn.getTime()) / 60_000);
  }, 0);
}

// `records` comes from the same capped, most-recent-60 fetch the day-by-day
// list below already uses — navigating far enough into the past can run
// out of loaded data before it runs out of real history. Acceptable for
// v1; a "load more" would need a real date-range query.
export function WeeklyTimesheetGrid({
  records,
  onDayPress,
}: {
  records: AttendanceRecord[];
  // Tapping a day only makes sense if there's something to show — cells
  // with no recorded data aren't pressable at all, not just a dead tap.
  // A day with more than one check-in (rare — nothing stops re-checking-in
  // same day) links to the earliest one rather than building a whole
  // separate multi-session day view for an edge case.
  onDayPress?: (recordId: string) => void;
}) {
  const theme = useTheme();
  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = useMemo(() => {
    const base = startOfWeek(new Date());
    base.setDate(base.getDate() + weekOffset * 7);
    return base;
  }, [weekOffset]);

  const days = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      const dayRecords = records
        .filter((r) => isSameDate(new Date(r.check_in_at), date))
        .sort((a, b) => new Date(a.check_in_at).getTime() - new Date(b.check_in_at).getTime());
      return {
        date,
        minutes: minutesWorkedOn(records, date),
        isToday: isSameDate(date, today),
        recordId: dayRecords[0]?.id ?? null,
      };
    });
  }, [weekStart, records]);

  const rangeLabel = `${weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${days[6].date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="chevron-left" size={20} style={styles.navButton} onPress={() => setWeekOffset((w) => w - 1)} />
        <Text variant="labelLarge">{rangeLabel}</Text>
        <IconButton
          icon="chevron-right"
          size={20}
          style={styles.navButton}
          disabled={weekOffset >= 0}
          onPress={() => setWeekOffset((w) => Math.min(0, w + 1))}
        />
      </View>
      <View style={styles.grid}>
        {days.map((day, i) => (
          <Pressable
            key={i}
            disabled={!day.recordId}
            onPress={() => day.recordId && onDayPress?.(day.recordId)}
            android_ripple={day.recordId ? { color: theme.colors.outlineVariant, borderless: false } : undefined}
            style={({ pressed }) => [
              styles.dayCell,
              day.isToday && { backgroundColor: theme.colors.secondaryContainer },
              day.recordId && pressed && { opacity: 0.6 },
            ]}
          >
            <Text variant="labelSmall" style={styles.dayLetter}>
              {DAY_LETTERS[i]}
            </Text>
            <Text variant="labelMedium">{day.date.getDate()}</Text>
            <Text variant="labelSmall" style={styles.hours} numberOfLines={1}>
              {formatHours(day.minutes)}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 8,
  },
  navButton: {
    margin: 0,
  },
  grid: {
    flexDirection: 'row',
    gap: 4,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  dayLetter: {
    opacity: 0.6,
  },
  hours: {
    marginTop: 4,
    opacity: 0.7,
  },
});
