import { useState } from 'react';
// Reuses staffService's existing updateEmployee rather than a new function —
// same cross-feature-via-service-layer reuse this app already does
// elsewhere (e.g. locations/ reusing attendance/'s geolocation code).
// Position/department/mobile_number aren't self-editable (0019 only widens
// the self-update trigger for `name`, on top of 0015's `avatar_path`), so
// they're sent back unchanged alongside the new name.
import * as staffService from '@/features/staff/services/staffService';
import { useAuth } from './useAuth';

export function useUpdateMyName() {
  const { profile, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function updateName(name: string) {
    if (!profile) return false;
    setSaving(true);
    setError(null);
    try {
      await staffService.updateEmployee(profile.id, {
        name,
        position: profile.position ?? '',
        department: profile.department ?? '',
        mobile_number: profile.mobile_number ?? '',
      });
      await refreshProfile();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your name.');
      return false;
    } finally {
      setSaving(false);
    }
  }

  return { saving, error, updateName };
}
