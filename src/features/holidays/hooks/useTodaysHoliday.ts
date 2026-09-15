import { useCallback, useState } from 'react';
import { toDateOnly } from '@/lib/dateOnly';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import * as holidaysService from '../services/holidaysService';
import type { Holiday } from '../types';

// Informational (and, when `blocks_check_in` is set, gating) lookup for the
// Check-In screen — same shape as useDaysCheckedInThisMonth: a small,
// explicitly today-scoped query, silent-fail so a lookup hiccup here never
// blocks the whole Check-In screen from rendering.
export function useTodaysHoliday(): Holiday | null {
  const [holiday, setHoliday] = useState<Holiday | null>(null);

  const load = useCallback(async () => {
    try {
      setHoliday(await holidaysService.getTodaysHoliday(toDateOnly(new Date())));
    } catch {
      setHoliday(null);
    }
  }, []);

  useRefetchOnFocus(load);

  return holiday;
}
