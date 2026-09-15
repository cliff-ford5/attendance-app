import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/services/supabase';

function extensionForMimeType(mimeType?: string): string {
  return mimeType === 'image/png' ? 'png' : 'jpg';
}

// Returns the new storage path, or null if the user cancelled picking.
export async function pickAndUploadAvatar(employeeId: string): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (permission.status !== 'granted') {
    throw new Error('Photo library access is needed to choose a profile picture.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });
  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  // Fixed filename per employee (not a new file per upload) — each new
  // photo overwrites the last via `upsert`, so there's nothing to clean up.
  const path = `${employeeId}/avatar.${extensionForMimeType(asset.mimeType)}`;

  const response = await fetch(asset.uri);
  const arrayBuffer = await response.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, arrayBuffer, { contentType: asset.mimeType ?? 'image/jpeg', upsert: true });
  if (uploadError) throw uploadError;

  const { error: updateError } = await supabase.from('employees').update({ avatar_path: path }).eq('id', employeeId);
  if (updateError) throw updateError;

  return path;
}

// Storage already grants the account owner delete on their own folder
// (`avatar_delete_own`, 0015) — the trigger only ever restricted which
// *columns* the employees table update could touch, not what value
// avatar_path is allowed to take, so setting it back to null needs no new
// migration either.
export async function removeAvatar(employeeId: string, avatarPath: string): Promise<void> {
  const { error: removeError } = await supabase.storage.from('avatars').remove([avatarPath]);
  if (removeError) throw removeError;

  const { error: updateError } = await supabase.from('employees').update({ avatar_path: null }).eq('id', employeeId);
  if (updateError) throw updateError;
}
