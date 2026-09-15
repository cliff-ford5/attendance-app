import { useCallback, useState } from 'react';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import * as holidaysService from '../services/holidaysService';
import type { Holiday, HolidayInput } from '../types';

export function useHolidays() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setHolidays(await holidaysService.getAllHolidays());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load holidays.');
    } finally {
      setLoading(false);
    }
  }, []);

  useRefetchOnFocus(load);

  async function save(input: HolidayInput, editingId?: string) {
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        const updated = await holidaysService.updateHoliday(editingId, input);
        setHolidays((prev) => prev.map((h) => (h.id === editingId ? updated : h)).sort((a, b) => a.date.localeCompare(b.date)));
      } else {
        const created = await holidaysService.createHoliday(input);
        setHolidays((prev) => [...prev, created].sort((a, b) => a.date.localeCompare(b.date)));
      }
      return true;
    } catch (e) {
      // The realistic failure here is the unique constraint on `date`
      // rejecting a second holiday on the same day — a clearer, actionable
      // message beats surfacing the raw Postgres text.
      setError(e instanceof Error && e.message.includes('duplicate') ? 'A holiday is already set for this date.' : 'Could not save this holiday.');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setDeletingId(id);
    setError(null);
    try {
      await holidaysService.deleteHoliday(id);
      setHolidays((prev) => prev.filter((h) => h.id !== id));
      return true;
    } catch {
      setError('Could not delete this holiday.');
      return false;
    } finally {
      setDeletingId(null);
    }
  }

  return { holidays, loading, error, saving, deletingId, save, remove, reload: load };
}
