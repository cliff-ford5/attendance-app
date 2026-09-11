import { useCallback, useState } from 'react';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import * as locationsService from '../services/locationsService';
import type { Location, LocationInput } from '../types';

export function useLocations() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setLocations(await locationsService.getAllLocations());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load locations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useRefetchOnFocus(load);

  async function save(input: LocationInput, editingId?: string) {
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        const updated = await locationsService.updateLocation(editingId, input);
        setLocations((prev) => prev.map((l) => (l.id === editingId ? updated : l)));
      } else {
        const created = await locationsService.createLocation(input);
        setLocations((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      }
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save this location.');
      return false;
    } finally {
      setSaving(false);
    }
  }

  return { locations, loading, error, saving, save, reload: load };
}
