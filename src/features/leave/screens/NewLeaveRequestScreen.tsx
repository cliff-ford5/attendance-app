import DateTimePicker from '@react-native-community/datetimepicker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, Icon, Menu, Text, useTheme } from 'react-native-paper';
import { AppHeader } from '@/components/AppHeader';
import { AppTextInput as TextInput } from '@/components/AppTextInput';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { openAndroidDatePicker } from '@/lib/androidDateTimePicker';
import type { LeaveType } from '@/types/database';
import { useCreateLeaveRequest } from '../hooks/useCreateLeaveRequest';
import { useLeaveAttachment } from '../hooks/useLeaveAttachment';
import { useMyLeaveRequests } from '../hooks/useMyLeaveRequests';
import { LEAVE_TYPE_LABELS } from '../types';

function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d;
}

// Pulled out of MyLeaveScreen (2026-09-14) — was an always-visible Card
// sitting above the request list; a "+" there now opens this as its own
// modal-presented route instead. Same reasoning as the other two forms
// converted alongside this one: real complexity here (dropdown, two date
// pickers, optional photo/location attachment) needs real space, and a
// dedicated route sidesteps nesting a Menu/DateTimePicker inside a Dialog.
//
// Edit mode (added 2026-09-15): an optional `id` query param switches this
// into editing an existing still-pending request in place, instead of
// cancel + resubmit as two separate requests — same "id param, pre-fill
// from the list screen's already-loaded data" shape as the task/location/
// holiday forms.
export function NewLeaveRequestScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { profile } = useAuth();
  const { create, submitting, error: createError } = useCreateLeaveRequest(profile?.id);
  const { requests, savingId, edit, error: editError } = useMyLeaveRequests(profile?.id);
  const attachment = useLeaveAttachment(profile?.id);
  const isEditing = Boolean(id);
  const editingRequest = id ? requests.find((r) => r.id === id) : undefined;

  const [leaveType, setLeaveType] = useState<LeaveType>('vacation');
  const [startDate, setStartDate] = useState(tomorrow());
  const [endDate, setEndDate] = useState(tomorrow());
  const [reason, setReason] = useState('');
  const [pickerFor, setPickerFor] = useState<'start' | 'end' | null>(null);
  const [typeMenuVisible, setTypeMenuVisible] = useState(false);

  useEffect(() => {
    if (editingRequest) {
      setLeaveType(editingRequest.leave_type);
      setStartDate(new Date(editingRequest.start_date));
      setEndDate(new Date(editingRequest.end_date));
      setReason(editingRequest.reason ?? '');
      attachment.seed({
        attachmentPath: editingRequest.attachment_path,
        location:
          editingRequest.location_lat != null && editingRequest.location_lng != null
            ? { lat: editingRequest.location_lat, lng: editingRequest.location_lng, address: editingRequest.location_address }
            : null,
      });
    }
    // Deliberately keyed on `editingRequest` alone, not the whole
    // `attachment` object — that object is recreated by useLeaveAttachment
    // on every one of its own state changes, which would re-run this seed
    // (and clobber whatever the employee just picked) on every edit.
  }, [editingRequest]);

  function applyDate(which: 'start' | 'end', selected: Date) {
    if (which === 'start') {
      setStartDate(selected);
      if (selected > endDate) setEndDate(selected);
    } else {
      setEndDate(selected);
    }
  }

  function openPickerFor(which: 'start' | 'end') {
    if (Platform.OS === 'android') {
      openAndroidDatePicker(which === 'start' ? startDate : endDate, (selected) => applyDate(which, selected), which === 'end' ? startDate : undefined);
    } else {
      setPickerFor(which);
    }
  }

  async function handleSubmit() {
    const input = {
      leaveType,
      startDate,
      endDate,
      reason: reason.trim(),
      attachmentPath: attachment.attachmentPath,
      locationLat: attachment.location?.lat,
      locationLng: attachment.location?.lng,
      locationAddress: attachment.location?.address,
    };
    const ok = isEditing && id ? await edit(id, input) : await create(input);
    if (ok) router.back();
  }

  const busy = isEditing ? savingId === id : submitting;
  const submitError = isEditing ? editError : createError;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen
        options={{ header: () => <AppHeader title={isEditing ? 'Edit Leave Request' : 'Request Time Off'} onClose={() => router.back()} /> }}
      />
      <Menu
        visible={typeMenuVisible}
        onDismiss={() => setTypeMenuVisible(false)}
        anchor={
          <Pressable
            onPress={() => setTypeMenuVisible(true)}
            style={[styles.dropdownAnchor, { borderColor: theme.colors.outline }, styles.input]}
          >
            <Icon source="menu-down" size={20} color={theme.colors.onSurface} />
            <Text variant="labelLarge" style={{ color: theme.colors.onSurface }}>
              Type: {LEAVE_TYPE_LABELS[leaveType]}
            </Text>
          </Pressable>
        }
      >
        {(Object.keys(LEAVE_TYPE_LABELS) as LeaveType[]).map((type) => (
          <Menu.Item
            key={type}
            title={LEAVE_TYPE_LABELS[type]}
            onPress={() => {
              setLeaveType(type);
              setTypeMenuVisible(false);
            }}
          />
        ))}
      </Menu>

      <Button
        mode="outlined"
        icon="calendar-outline"
        textColor={theme.colors.onSurface}
        onPress={() => openPickerFor('start')}
        style={styles.input}
      >
        From: {startDate.toLocaleDateString()}
      </Button>
      <Button
        mode="outlined"
        icon="calendar-outline"
        textColor={theme.colors.onSurface}
        onPress={() => openPickerFor('end')}
        style={styles.input}
      >
        To: {endDate.toLocaleDateString()}
      </Button>
      {pickerFor && Platform.OS !== 'android' && (
        <DateTimePicker
          value={pickerFor === 'start' ? startDate : endDate}
          mode="date"
          minimumDate={pickerFor === 'end' ? startDate : undefined}
          onChange={(_, selected) => {
            const activeFor = pickerFor;
            setPickerFor(Platform.OS === 'ios' ? activeFor : null);
            if (selected) applyDate(activeFor, selected);
          }}
        />
      )}

      <TextInput label="Reason (optional)" value={reason} onChangeText={setReason} multiline style={styles.input} />

      {/* Optional supporting evidence — e.g. a photo of a flooded road, plus
          where the employee is when submitting — so an admin reviewing the
          request has more than free text to go on. Genuinely optional. */}
      {attachment.attachmentPath ? (
        <View style={styles.attachmentRow}>
          <View style={styles.attachmentLabel}>
            <Icon source="camera-outline" size={18} color={theme.colors.onSurfaceVariant} />
            <Text variant="bodyMedium" style={styles.attachmentText}>
              Photo attached
            </Text>
          </View>
          <Button mode="text" compact onPress={attachment.removePhoto}>
            Remove
          </Button>
        </View>
      ) : (
        <Button
          mode="outlined"
          icon="camera-outline"
          textColor={theme.colors.onSurface}
          onPress={attachment.addPhoto}
          loading={attachment.uploadingPhoto}
          disabled={attachment.uploadingPhoto}
          style={styles.input}
        >
          Attach photo (optional)
        </Button>
      )}

      {attachment.location ? (
        <View style={styles.attachmentRow}>
          <View style={styles.attachmentLabel}>
            <Icon source="map-marker-outline" size={18} color={theme.colors.onSurfaceVariant} />
            <Text variant="bodyMedium" style={styles.attachmentText} numberOfLines={1}>
              {attachment.location.address ?? 'Current location attached'}
            </Text>
          </View>
          <Button mode="text" compact onPress={attachment.removeLocation}>
            Remove
          </Button>
        </View>
      ) : (
        <Button
          mode="outlined"
          icon="map-marker-outline"
          textColor={theme.colors.onSurface}
          onPress={attachment.addLocation}
          loading={attachment.fetchingLocation}
          disabled={attachment.fetchingLocation}
          style={styles.input}
        >
          Attach current location (optional)
        </Button>
      )}

      {attachment.error && <HelperText type="error">{attachment.error}</HelperText>}
      {submitError && <HelperText type="error">{submitError}</HelperText>}

      <Button mode="contained" onPress={handleSubmit} loading={busy} disabled={busy}>
        {isEditing ? 'Save changes' : 'Submit request'}
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
  dropdownAnchor: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 28,
    paddingVertical: 12,
  },
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  attachmentLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  attachmentText: {
    flexShrink: 1,
  },
});
