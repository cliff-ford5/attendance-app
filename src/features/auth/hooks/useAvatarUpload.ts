import { useState } from 'react';
import * as avatarService from '../services/avatarService';
import { useAuth } from './useAuth';

export function useAvatarUpload() {
  const { profile, refreshProfile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pickAndUpload() {
    if (!profile?.id) return;
    setUploading(true);
    setError(null);
    try {
      const path = await avatarService.pickAndUploadAvatar(profile.id);
      if (path) await refreshProfile();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update your profile picture.');
    } finally {
      setUploading(false);
    }
  }

  return { uploading, error, pickAndUpload };
}
