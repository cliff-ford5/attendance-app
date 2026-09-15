import DateTimePicker from '@react-native-community/datetimepicker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet } from 'react-native';
import { Button, HelperText, List, Switch, useTheme } from 'react-native-paper';
import { AppHeader } from '@/components/AppHeader';
import { AppTextInput as TextInput } from '@/components/AppTextInput';
import { toDateOnly } from '@/lib/dateOnly';
import { openAndroidDatePicker } from '@/lib/androidDateTimePicker';
import { useHolidays } from '../hooks/useHolidays';

// Same "+"-button/modal-route shape as the task/location forms — `id`
// (optional query param) switches it into edit mode, pre-filling from the
// same useHolidays list HolidaysScreen already loads, no separate
// get-by-id fetch needed.
export function HolidayFormScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { holidays, saving, save } = useHolidays();
  const isEditing = Boolean(id);
  const editingHoliday = id ? holidays.find((h) => h.id === id) : undefined;

  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date());
  const [blocksCheckIn, setBlocksCheckIn] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (editingHoliday) {
      setName(editingHoliday.name);
      const [year, month, day] = editingHoliday.date.split('-').map(Number);
      setDate(new Date(year, month - 1, day));
      setBlocksCheckIn(editingHoliday.blocks_check_in);
    }
  }, [editingHoliday]);

  function openPicker() {
    if (Platform.OS === 'android') {
      openAndroidDatePicker(date, setDate);
    } else {
      setPickerVisible(true);
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      setFormError('Give this holiday a name.');
      return;
    }
    setFormError(null);
    const ok = await save({ name: name.trim(), date: toDateOnly(date), blocksCheckIn }, id ?? undefined);
    if (ok) router.back();
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen
        options={{ header: () => <AppHeader title={isEditing ? 'Edit Holiday' : 'Add Holiday'} onClose={() => router.back()} /> }}
      />

      <TextInput label="Name" value={name} onChangeText={setName} style={styles.input} />

      <Button mode="outlined" icon="calendar-outline" textColor={theme.colors.onSurface} onPress={openPicker} style={styles.input}>
        {date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
      </Button>
      {pickerVisible && Platform.OS !== 'android' && (
        <DateTimePicker
          value={date}
          mode="date"
          onChange={(_, selected) => {
            setPickerVisible(Platform.OS === 'ios');
            if (selected) setDate(selected);
          }}
        />
      )}

      <List.Item
        title="Block check-in on this day"
        description="Off means employees can still check in as normal."
        descriptionNumberOfLines={2}
        style={styles.switchRow}
        right={(props) => <Switch {...props} value={blocksCheckIn} onValueChange={setBlocksCheckIn} disabled={saving} />}
      />

      {formError && <HelperText type="error">{formError}</HelperText>}

      <Button mode="contained" onPress={handleSave} loading={saving} disabled={saving}>
        {isEditing ? 'Save changes' : 'Add holiday'}
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  input: {
    marginBottom: 12,
  },
  switchRow: {
    paddingHorizontal: 0,
    marginBottom: 12,
  },
});
