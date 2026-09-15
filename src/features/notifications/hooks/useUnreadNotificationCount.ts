import { useCallback, useState } from 'react';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import * as notificationsService from '../services/notificationsService';

// Powers AppHeader's bell badge — refetches on every focus (same as any
// other data hook here), so the count updates the moment a tab switch
// brings the header back into view, not just on cold start.
export function useUnreadNotificationCount(employeeId: string | undefined) {
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    if (!employeeId) return;
    try {
      setCount(await notificationsService.getUnreadCount(employeeId));
    } catch {
      // Silent — a stale/missing badge count isn't worth surfacing an
      // error for on every header render.
    }
  }, [employeeId]);

  useRefetchOnFocus(load);

  return count;
}
