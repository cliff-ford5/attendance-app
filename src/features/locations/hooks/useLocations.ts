import { useCallback, useState } from 'react';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import * as locationsService from '../services/locationsService';
import type { Location, LocationInput } from '../types';

export function useLocations() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  async function remove(id: string) {
    setDeletingId(id);
    setError(null);
    try {
      await locationsService.deleteLocation(id);
      setLocations((prev) => prev.filter((l) => l.id !== id));
      return true;
    } catch {
      // The realistic failure here is the FK on employees.location_id
      // rejecting the delete because someone's still assigned here — a
      // clearer, actionable message beats surfacing the raw Postgres text.
      setError('Could not delete this location — make sure no employees are still assigned to it first.');
      return false;
    } finally {
      setDeletingId(null);
    }
  }

  return { locations, loading, error, saving, deletingId, save, remove, reload: load };
}
