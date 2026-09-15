import DateTimePicker from '@react-native-community/datetimepicker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet } from 'react-native';
import { Button, HelperText, List, Switch, Text, useTheme } from 'react-native-paper';
import { AppHeader } from '@/components/AppHeader';
import { AppSegmentedButtons } from '@/components/AppSegmentedButtons';
import { EmptyState, ErrorState, LoadingState } from '@/components/ScreenState';
import { openAndroidDateTimePicker } from '@/lib/androidDateTimePicker';
import type { DayType } from '@/types/database';
import { useAttendanceRecord } from '../hooks/useAttendanceRecord';
import { useEditAttendanceRecord } from '../hooks/useEditAttendanceRecord';

// Admin-only correction of an already-written record — the real gap flagged
// in TODO.md's CRUD-gap audit: once written, an attendance record used to be
// permanent, with no recourse for a wrong time or a stray duplicate. Reuses
// useAttendanceRecord (same by-id fetch AttendanceDetailScreen uses) rather
// than a separate get-by-id, same reasoning as the task/location forms
// reusing their list screens' already-loaded data.
//
// Check-out editing only applies to an already-closed record — an open
// record's check-out belongs to the existing "Check out" action (Recent
// history's swipe/button), not this form, so those fields are hidden
// entirely rather than half-supporting a state this screen didn't design
// for (reopening a closed shift, or closing one with a backdated time that
// skips the admin_correction tagging adminCheckOut already does).
export function EditAttendanceRecordScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { record, loading, error: loadError, reload } = useAttendanceRecord(id);
  const { saving, error: saveError, save } = useEditAttendanceRecord();

  const [checkInAt, setCheckInAt] = useState(new Date());
  const [checkOutAt, setCheckOutAt] = useState<Date | null>(null);
  const [dayType, setDayType] = useState<DayType>('full');
  const [isLate, setIsLate] = useState(false);
  const [leftEarly, setLeftEarly] = useState(false);
  const [pickerFor, setPickerFor] = useState<'in' | 'out' | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const wasOpen = record ? !record.check_out_at : false;

  useEffect(() => {
    if (!record) return;
    setCheckInAt(new Date(record.check_in_at));
    setCheckOutAt(record.check_out_at ? new Date(record.check_out_at) : null);
    setDayType(record.day_type);
    setIsLate(record.is_late);
    setLeftEarly(record.left_early);
  }, [record]);

  function openPickerFor(which: 'in' | 'out') {
    const current = which === 'in' ? checkInAt : (checkOutAt ?? checkInAt);
    if (Platform.OS === 'android') {
      openAndroidDateTimePicker(current, which === 'in' ? setCheckInAt : setCheckOutAt);
    } else {
      setPickerFor(which);
    }
  }

  async function handleSave() {
    if (!record) return;
    if (checkOutAt && checkOutAt <= checkInAt) {
      setFormError('Check-out must be after check-in.');
      return;
    }
    setFormError(null);
    const ok = await save(record.id, {
      check_in_at: checkInAt.toISOString(),
      check_out_at: checkOutAt ? checkOutAt.toISOString() : null,
      day_type: dayType,
      is_late: isLate,
      left_early: leftEarly,
    });
    if (ok) {
      reload();
      router.back();
    }
  }

  if (loading) return <LoadingState label="Loading…" />;
  if (loadError) return <ErrorState message={loadError} onRetry={reload} />;
  if (!record) return <EmptyState message="This attendance record couldn't be found." />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ header: () => <AppHeader title="Edit attendance" onClose={() => router.back()} /> }} />

      <Text variant="labelLarge" style={styles.label}>
        Check in
      </Text>
      <Button
        mode="outlined"
        icon="calendar-clock-outline"
        textColor={theme.colors.onSurface}
        onPress={() => openPickerFor('in')}
        style={styles.input}
      >
        {checkInAt.toLocaleString()}
      </Button>

      {wasOpen ? (
        <Text variant="bodySmall" style={styles.openNote}>
          This shift is still open — use "Check out" from Recent history to close it.
        </Text>
      ) : (
        <>
          <Text variant="labelLarge" style={styles.label}>
            Check out
          </Text>
          <Button
            mode="outlined"
            icon="calendar-clock-outline"
            textColor={theme.colors.onSurface}
            onPress={() => openPickerFor('out')}
            style={styles.input}
          >
            {checkOutAt ? checkOutAt.toLocaleString() : 'Not set'}
          </Button>
        </>
      )}

      {pickerFor && Platform.OS !== 'android' && (
        <DateTimePicker
          value={(pickerFor === 'in' ? checkInAt : checkOutAt) ?? checkInAt}
          mode="datetime"
          onChange={(_, selected) => {
            const activeFor = pickerFor;
            setPickerFor(Platform.OS === 'ios' ? activeFor : null);
            if (!selected) return;
            if (activeFor === 'in') setCheckInAt(selected);
            else setCheckOutAt(selected);
          }}
        />
      )}

      <Text variant="labelLarge" style={styles.label}>
        Day type
      </Text>
      <AppSegmentedButtons
        value={dayType}
        onValueChange={(v) => setDayType(v as DayType)}
        style={styles.input}
        buttons={[
          { value: 'full', label: 'Full day' },
          { value: 'half', label: 'Half day' },
        ]}
      />

      <List.Item
        title="Late"
        style={styles.switchRow}
        right={(props) => <Switch {...props} value={isLate} onValueChange={setIsLate} disabled={saving} />}
      />
      <List.Item
        title="Left early"
        style={styles.switchRow}
        right={(props) => <Switch {...props} value={leftEarly} onValueChange={setLeftEarly} disabled={saving} />}
      />

      {(formError ?? saveError) && <HelperText type="error">{formError ?? saveError}</HelperText>}

      <Button mode="contained" onPress={handleSave} loading={saving} disabled={saving} style={styles.saveButton}>
        Save changes
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  label: {
    marginBottom: 8,
    opacity: 0.7,
  },
  input: {
    marginBottom: 16,
  },
  openNote: {
    marginBottom: 16,
    opacity: 0.7,
  },
  switchRow: {
    paddingHorizontal: 0,
  },
  saveButton: {
    marginTop: 8,
  },
});
