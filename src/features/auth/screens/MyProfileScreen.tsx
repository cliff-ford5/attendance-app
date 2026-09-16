import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Dialog, Divider, HelperText, IconButton, List, Portal, Switch, Text, useTheme } from 'react-native-paper';
import { AppAvatar } from '@/components/AppAvatar';
import { AppTextInput as TextInput } from '@/components/AppTextInput';
import { LoadingState } from '@/components/ScreenState';
import { useAuth } from '../hooks/useAuth';
import { useAvatarUpload } from '../hooks/useAvatarUpload';
import { useBiometricLock } from '../hooks/useBiometricLock';
import { useUpdateMyName } from '../hooks/useUpdateMyName';

// The signed-in user's own profile — name and avatar are self-editable
// (see supabase/0015 + 0019); email/position/department/mobile number stay
// admin-only (StaffProfileScreen), shown here read-only with a note saying
// so, rather than silently omitted, so it's clear these exist and how to
// actually change them.
export function MyProfileScreen() {
  const theme = useTheme();
  const { profile } = useAuth();
  const { uploading, removing, error: avatarError, pickAndUpload, removeAvatar } = useAvatarUpload();
  const { saving, error: nameError, updateName } = useUpdateMyName();
  const { supported: biometricSupported, enabled: biometricEnabled, setEnabled: setBiometricEnabled } = useBiometricLock();
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [pendingRemove, setPendingRemove] = useState(false);
  const [biometricError, setBiometricError] = useState<string | null>(null);
  const [savingBiometric, setSavingBiometric] = useState(false);

  async function handleBiometricToggle(next: boolean) {
    setBiometricError(null);
    setSavingBiometric(true);
    try {
      const ok = await setBiometricEnabled(next);
      if (!ok) setBiometricError('Could not verify — try again.');
    } finally {
      setSavingBiometric(false);
    }
  }

  if (!profile) return <LoadingState label="Loading your profile…" />;

  function startEditName() {
    setNameDraft(profile!.name);
    setEditingName(true);
  }

  async function saveName() {
    if (nameDraft.trim().length === 0) return;
    const ok = await updateName(nameDraft.trim());
    if (ok) setEditingName(false);
  }

  async function confirmRemoveAvatar() {
    await removeAvatar();
    setPendingRemove(false);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.avatarSection}>
        <AppAvatar name={profile.name} avatarPath={profile.avatar_path} size={96} />
        <View style={styles.avatarActionsRow}>
          <Button mode="outlined" onPress={pickAndUpload} loading={uploading} disabled={uploading || removing}>
            {profile.avatar_path ? 'Change photo' : 'Add photo'}
          </Button>
          {profile.avatar_path && (
            <Button
              mode="text"
              textColor={theme.colors.error}
              onPress={() => setPendingRemove(true)}
              disabled={uploading || removing}
            >
              Remove
            </Button>
          )}
        </View>
        {avatarError && <HelperText type="error">{avatarError}</HelperText>}
      </View>

      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.fieldHeaderRow}>
            <Text variant="labelLarge" style={styles.fieldLabel}>
              Name
            </Text>
            {!editingName && (
              <IconButton icon="pencil-outline" size={18} style={styles.editIcon} onPress={startEditName} accessibilityLabel="Edit name" />
            )}
          </View>
          {editingName ? (
            <>
              <TextInput value={nameDraft} onChangeText={setNameDraft} style={styles.input} />
              {nameError && <HelperText type="error">{nameError}</HelperText>}
              <View style={styles.editActionsRow}>
                <Button mode="text" onPress={() => setEditingName(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button mode="contained" onPress={saveName} loading={saving} disabled={saving || nameDraft.trim().length === 0}>
                  Save
                </Button>
              </View>
            </>
          ) : (
            <Text variant="bodyLarge" style={styles.value}>
              {profile.name}
            </Text>
          )}

          <Divider style={styles.divider} />

          <Text variant="labelLarge" style={styles.fieldLabel}>
            Email
          </Text>
          <Text variant="bodyMedium" style={styles.readOnlyValue}>
            {profile.email}
          </Text>

          <Text variant="labelLarge" style={styles.fieldLabel}>
            Position
          </Text>
          <Text variant="bodyMedium" style={styles.readOnlyValue}>
            {profile.position || 'Not set'}
          </Text>

          <Text variant="labelLarge" style={styles.fieldLabel}>
            Department
          </Text>
          <Text variant="bodyMedium" style={styles.readOnlyValue}>
            {profile.department || 'Not set'}
          </Text>

          <Text variant="labelLarge" style={styles.fieldLabel}>
            Mobile number
          </Text>
          <Text variant="bodyMedium" style={styles.readOnlyValue}>
            {profile.mobile_number || 'Not set'}
          </Text>

          <HelperText type="info">Contact an admin to update your position, department, or mobile number.</HelperText>
        </Card.Content>
      </Card>

      {biometricSupported && (
        <Card style={styles.card}>
          <Card.Content>
            <List.Item
              title="Require Face ID / fingerprint"
              description="Lock the app when it's not in use — only you can open it."
              descriptionNumberOfLines={2}
              style={styles.biometricRow}
              right={(props) => (
                <Switch {...props} value={biometricEnabled} onValueChange={handleBiometricToggle} disabled={savingBiometric} />
              )}
            />
            {biometricError && <HelperText type="error">{biometricError}</HelperText>}
          </Card.Content>
        </Card>
      )}

      <Portal>
        <Dialog visible={pendingRemove} onDismiss={() => setPendingRemove(false)}>
          <Dialog.Title>Remove profile picture?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">You can add a new one anytime.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPendingRemove(false)}>Cancel</Button>
            <Button onPress={confirmRemoveAvatar} loading={removing}>
              Remove
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  card: {
    marginBottom: 8,
  },
  fieldHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    marginTop: 12,
    opacity: 0.7,
  },
  editIcon: {
    margin: 0,
  },
  value: {
    marginTop: 2,
  },
  readOnlyValue: {
    marginTop: 2,
    opacity: 0.6,
  },
  input: {
    marginTop: 4,
    marginBottom: 4,
  },
  editActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  divider: {
    marginVertical: 16,
  },
  biometricRow: {
    paddingHorizontal: 0,
  },
});
