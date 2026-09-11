import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { FlatList, Platform, StyleSheet, View } from 'react-native';
import { Button, Card, HelperText, List, Text, useTheme } from 'react-native-paper';
import { AppTextInput as TextInput } from '@/components/AppTextInput';
import { ErrorState, LoadingState } from '@/components/ScreenState';
import {
  getCurrentCoordinates,
  getForegroundPermissionStatus,
  requestForegroundPermission,
} from '@/features/attendance/services/locationService';
import { openAndroidTimePicker } from '@/lib/androidDateTimePicker';
import { dateToTime, timeToDate } from '@/lib/timeOfDay';
import { useLocations } from '../hooks/useLocations';
import type { Location } from '../types';

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

export function LocationsScreen() {
  const theme = useTheme();
  const { locations, loading, error, saving, save, reload } = useLocations();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [locating, setLocating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [timePickerFor, setTimePickerFor] = useState<'start' | 'end' | null>(null);

  if (loading) return <LoadingState label="Loading locations…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  function startEditing(location: Location) {
    setEditingId(location.id);
    setForm({
      name: location.name,
      latitude: String(location.latitude),
      longitude: String(location.longitude),
      radiusMeters: String(location.radius_meters),
      expectedStart: timeToDate(location.expected_start),
      expectedEnd: timeToDate(location.expected_end),
    });
    setFormError(null);
  }

  function startNew() {
    setEditingId(null);
    setForm(emptyForm());
    setFormError(null);
  }

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
      let status = await getForegroundPermissionStatus();
      if (status !== 'granted') status = await requestForegroundPermission();
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
      editingId ?? undefined
    );
    if (ok) startNew();
  }

  return (
    <FlatList
      data={locations}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <Card style={styles.form}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.formTitle}>
              {editingId ? 'Edit location' : 'Add a location'}
            </Text>

            <TextInput
              label="Name"
              value={form.name}
              onChangeText={(v) => setForm((prev) => ({ ...prev, name: v }))}
              style={styles.input}
            />

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

            <View style={styles.actionsRow}>
              {editingId && (
                <Button mode="text" onPress={startNew} disabled={saving}>
                  Cancel
                </Button>
              )}
              <Button mode="contained" onPress={handleSave} loading={saving} disabled={saving}>
                {editingId ? 'Save changes' : 'Add location'}
              </Button>
            </View>
          </Card.Content>
        </Card>
      }
      renderItem={({ item }) => (
        <List.Item
          title={item.name}
          description={`${item.latitude.toFixed(5)}, ${item.longitude.toFixed(5)} · ${item.radius_meters}m radius\n${item.expected_start}–${item.expected_end}`}
          descriptionNumberOfLines={2}
          left={(props) => <List.Icon {...props} icon="map-marker-outline" />}
          onPress={() => startEditing(item)}
        />
      )}
      contentContainerStyle={styles.listContent}
    />
  );
}

const styles = StyleSheet.create({
  form: {
    margin: 16,
  },
  formTitle: {
    marginBottom: 12,
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
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  listContent: {
    paddingBottom: 24,
  },
});
