import DateTimePicker from '@react-native-community/datetimepicker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, Text, useTheme } from 'react-native-paper';
import { AppHeader } from '@/components/AppHeader';
import { AppTextInput as TextInput } from '@/components/AppTextInput';
import { getCurrentCoordinates, getForegroundPermissionStatus, requestForegroundPermission } from '@/features/attendance/services/locationService';
import { openAndroidTimePicker } from '@/lib/androidDateTimePicker';
import { dateToTime, timeToDate } from '@/lib/timeOfDay';
import { useLocations } from '../hooks/useLocations';

const DEFAULT_RADIUS = '4000';
const DEFAULT_START = '09:00';
const DEFAULT_END = '18:00';

function emptyForm() {
  return {
    name: '',
    latitude: '',
    longitude: '',
    radiusMeters: DEFAULT_RADIUS,
    expectedStart: timeToDate(DEFAULT_START),
    expectedEnd: timeToDate(DEFAULT_END),
  };
}

// Pulled out of LocationsScreen (2026-09-14) — was an always-visible Card
// above the location list, doing double duty as add and edit. Now its own
// modal-presented route; `id` (optional query param) switches it into edit
// mode, pre-filling from the same useLocations list the list screen already
// loads (no separate get-by-id fetch needed, same reasoning as the task
// form's reuse of useMyTasks).
export function LocationFormScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { locations, saving, save } = useLocations();
  const isEditing = Boolean(id);
  const editingLocation = id ? locations.find((l) => l.id === id) : undefined;

  const [form, setForm] = useState(emptyForm());
  const [locating, setLocating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [timePickerFor, setTimePickerFor] = useState<'start' | 'end' | null>(null);

  useEffect(() => {
    if (editingLocation) {
      setForm({
        name: editingLocation.name,
        latitude: String(editingLocation.latitude),
        longitude: String(editingLocation.longitude),
        radiusMeters: String(editingLocation.radius_meters),
        expectedStart: timeToDate(editingLocation.expected_start),
        expectedEnd: timeToDate(editingLocation.expected_end),
      });
    }
  }, [editingLocation]);

  function applyTime(which: 'start' | 'end', selected: Date) {
    setForm((prev) => ({ ...prev, [which === 'start' ? 'expectedStart' : 'expectedEnd']: selected }));
  }

  function openTimePickerFor(which: 'start' | 'end') {
    if (Platform.OS === 'android') {
      openAndroidTimePicker(which === 'start' ? form.expectedStart : form.expectedEnd, (selected) => applyTime(which, selected));
    } else {
      setTimePickerFor(which);
    }
  }

  async function useCurrentLocation() {
    setLocating(true);
    setFormError(null);
    try {
      let { status } = await getForegroundPermissionStatus();
      if (status !== 'granted') ({ status } = await requestForegroundPermission());
      if (status !== 'granted') {
        setFormError('Location permission is needed to fill this in automatically — enter coordinates manually instead.');
        return;
      }
      const coords = await getCurrentCoordinates();
      if (!coords) {
        setFormError('Could not get your current location. Enter coordinates manually instead.');
        return;
      }
      setForm((prev) => ({ ...prev, latitude: String(coords.latitude), longitude: String(coords.longitude) }));
    } finally {
      setLocating(false);
    }
  }

  async function handleSave() {
    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);
    const radiusMeters = Number(form.radiusMeters);

    if (!form.name.trim()) {
      setFormError('Give this location a name.');
      return;
    }
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setFormError('Latitude and longitude must be numbers.');
      return;
    }
    if (!Number.isFinite(radiusMeters) || radiusMeters <= 0) {
      setFormError('Radius must be a positive number of meters.');
      return;
    }

    setFormError(null);
    const ok = await save(
      {
        name: form.name.trim(),
        latitude,
        longitude,
        radiusMeters,
        expectedStart: dateToTime(form.expectedStart),
        expectedEnd: dateToTime(form.expectedEnd),
      },
      id ?? undefined
    );
    if (ok) router.back();
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen
        options={{ header: () => <AppHeader title={isEditing ? 'Edit Location' : 'Add Location'} onClose={() => router.back()} /> }}
      />

      <TextInput label="Name" value={form.name} onChangeText={(v) => setForm((prev) => ({ ...prev, name: v }))} style={styles.input} />

      <Button mode="outlined" onPress={useCurrentLocation} loading={locating} disabled={locating} style={styles.input}>
        Use my current location
      </Button>

      <View style={styles.row}>
        <TextInput
          label="Latitude"
          value={form.latitude}
          onChangeText={(v) => setForm((prev) => ({ ...prev, latitude: v }))}
          keyboardType="numeric"
          style={[styles.input, styles.rowItem]}
        />
        <TextInput
          label="Longitude"
          value={form.longitude}
          onChangeText={(v) => setForm((prev) => ({ ...prev, longitude: v }))}
          keyboardType="numeric"
          style={[styles.input, styles.rowItem]}
        />
      </View>

      <TextInput
        label="Geofence radius (meters)"
        value={form.radiusMeters}
        onChangeText={(v) => setForm((prev) => ({ ...prev, radiusMeters: v }))}
        keyboardType="numeric"
        style={styles.input}
      />

      <Text variant="bodySmall" style={styles.hoursLabel}>
        Expected work hours — used to flag late arrival / early departure for anyone assigned here
      </Text>
      <View style={styles.row}>
        <Button
          mode="outlined"
          textColor={theme.colors.onSurface}
          onPress={() => openTimePickerFor('start')}
          style={[styles.input, styles.rowItem]}
        >
          From {dateToTime(form.expectedStart)}
        </Button>
        <Button
          mode="outlined"
          textColor={theme.colors.onSurface}
          onPress={() => openTimePickerFor('end')}
          style={[styles.input, styles.rowItem]}
        >
          To {dateToTime(form.expectedEnd)}
        </Button>
      </View>
      {timePickerFor && Platform.OS !== 'android' && (
        <DateTimePicker
          value={timePickerFor === 'start' ? form.expectedStart : form.expectedEnd}
          mode="time"
          onChange={(_, selected) => {
            const activeFor = timePickerFor;
            setTimePickerFor(Platform.OS === 'ios' ? activeFor : null);
            if (selected) applyTime(activeFor, selected);
          }}
        />
      )}

      {formError && <HelperText type="error">{formError}</HelperText>}

      <Button mode="contained" onPress={handleSave} loading={saving} disabled={saving}>
        {isEditing ? 'Save changes' : 'Add location'}
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
  hoursLabel: {
    marginBottom: 8,
    opacity: 0.7,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  rowItem: {
    flex: 1,
  },
});
