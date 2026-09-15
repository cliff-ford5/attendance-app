import { useCallback, useState } from 'react';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import * as notificationsService from '../services/notificationsService';
import type { Notification } from '@/types/database';

const PAGE_SIZE = 20;

export function useNotifications(employeeId: string | undefined) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const load = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    setError(null);
    try {
      const page = await notificationsService.getMyNotifications(employeeId, 0, PAGE_SIZE);
      setNotifications(page.records);
      setHasMore(page.hasMore);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load notifications.');
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useRefetchOnFocus(load);

  async function loadMore() {
    if (!employeeId || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const page = await notificationsService.getMyNotifications(employeeId, notifications.length, PAGE_SIZE);
      setNotifications((prev) => [...prev, ...page.records]);
      setHasMore(page.hasMore);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load more notifications.');
    } finally {
      setLoadingMore(false);
    }
  }

  // Optimistic — the read state is low-stakes and this avoids a round trip
  // before the row's own "unread" styling updates.
  async function markAsRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: n.read_at ?? new Date().toISOString() } : n)));
    try {
      await notificationsService.markAsRead(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not mark this as read.');
    }
  }

  async function markAllAsRead() {
    if (!employeeId) return;
    setMarkingAllRead(true);
    const now = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? now })));
    try {
      await notificationsService.markAllAsRead(employeeId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not mark all as read.');
    } finally {
      setMarkingAllRead(false);
    }
  }

  return { notifications, loading, loadingMore, hasMore, loadMore, error, markAsRead, markAllAsRead, markingAllRead, reload: load };
}
