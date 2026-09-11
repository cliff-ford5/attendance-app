import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, HelperText, Switch, Text, useTheme } from 'react-native-paper';
import { ErrorState, LoadingState, NotConfiguredState } from '@/components/ScreenState';
import { isSupabaseConfigured } from '@/services/supabase';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { openAndroidTimePicker } from '@/lib/androidDateTimePicker';
import { dateToTime, timeToDate } from '@/lib/timeOfDay';
import { DAY_LABELS, SCHEDULE_DAY_ORDER } from '../constants';
import { useMySchedule } from '../hooks/useMySchedule';

type ActivePicker = { dayOfWeek: number; field: 'start' | 'end' } | null;

export function MyScheduleScreen() {
  const theme = useTheme();
  const { profile } = useAuth();
  const { days, loading, saving, error, updateDay, save } = useMySchedule(profile?.id);
  const [activePicker, setActivePicker] = useState<ActivePicker>(null);
  const [saved, setSaved] = useState(false);

  if (!isSupabaseConfigured) return <NotConfiguredState />;
  if (loading) return <LoadingState label="Loading your schedule…" />;
  if (error && days.length === 0) return <ErrorState message={error} />;

  function openPicker(dayOfWeek: number, field: 'start' | 'end', current: string) {
    setSaved(false);
    if (Platform.OS === 'android') {
      openAndroidTimePicker(timeToDate(current), (selected) => applyTime(dayOfWeek, field, selected));
    } else {
      setActivePicker({ dayOfWeek, field });
    }
  }

  function applyTime(dayOfWeek: number, field: 'start' | 'end', selected: Date) {
    updateDay(dayOfWeek, field === 'start' ? { startTime: dateToTime(selected) } : { endTime: dateToTime(selected) });
  }

  async function handleSave() {
    setSaved(false);
    const ok = await save();
    if (ok) setSaved(true);
  }

  const activeDay = activePicker ? days.find((d) => d.dayOfWeek === activePicker.dayOfWeek) : undefined;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text variant="bodyMedium" style={styles.intro}>
        Set the days and hours you normally work. This is just for reference — day-offs and sick leave still go
        through the Leave tab.
      </Text>

      {SCHEDULE_DAY_ORDER.map((dayOfWeek) => {
        const day = days.find((d) => d.dayOfWeek === dayOfWeek)!;
        return (
          <Card key={dayOfWeek} style={styles.dayCard}>
            <Card.Content style={styles.dayRow}>
              <View style={styles.dayLabelRow}>
                <Text variant="titleSmall">{DAY_LABELS[dayOfWeek]}</Text>
                <View style={styles.dayOffRow}>
                  <Text variant="bodySmall" style={styles.dayOffLabel}>
                    Day off
                  </Text>
                  <Switch
                    value={day.isDayOff}
                    onValueChange={(value) => {
                      setSaved(false);
                      updateDay(dayOfWeek, { isDayOff: value });
                    }}
                  />
                </View>
              </View>

              {!day.isDayOff && (
                <View style={styles.timeRow}>
                  <Button
                    mode="outlined"
                    textColor={theme.colors.onSurface}
                    onPress={() => openPicker(dayOfWeek, 'start', day.startTime ?? '09:00')}
                    style={styles.timeButton}
                  >
                    From {day.startTime ?? '09:00'}
                  </Button>
                  <Button
                    mode="outlined"
                    textColor={theme.colors.onSurface}
                    onPress={() => openPicker(dayOfWeek, 'end', day.endTime ?? '18:00')}
                    style={styles.timeButton}
                  >
                    To {day.endTime ?? '18:00'}
                  </Button>
                </View>
              )}
            </Card.Content>
          </Card>
        );
      })}

      {activePicker && activeDay && Platform.OS !== 'android' && (
        <DateTimePicker
          value={timeToDate(
            (activePicker.field === 'start' ? activeDay.startTime : activeDay.endTime) ??
              (activePicker.field === 'start' ? '09:00' : '18:00')
          )}
          mode="time"
          onChange={(_, selected) => {
            const picker = activePicker;
            setActivePicker(Platform.OS === 'ios' ? picker : null);
            if (selected && picker) applyTime(picker.dayOfWeek, picker.field, selected);
          }}
        />
      )}

      {error && <HelperText type="error">{error}</HelperText>}
      {saved && !error && <HelperText type="info">Schedule saved.</HelperText>}

      <Button mode="contained" onPress={handleSave} loading={saving} disabled={saving} style={styles.saveButton}>
        Save schedule
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  intro: {
    marginBottom: 16,
    opacity: 0.7,
  },
  dayCard: {
    marginBottom: 12,
  },
  dayRow: {
    gap: 12,
  },
  dayLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayOffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayOffLabel: {
    opacity: 0.7,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeButton: {
    flex: 1,
  },
  saveButton: {
    marginTop: 8,
  },
});
