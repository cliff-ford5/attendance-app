import { supabase } from '@/services/supabase';
import type { Notification } from '@/types/database';

// Paginated — same (offset, pageSize) -> { records, hasMore } shape as
// attendanceService.getRecentHistory (see ARCHITECTURE.md's Pagination
// section), since a notification list grows unbounded over the life of an
// account the same way attendance history does.
export async function getMyNotifications(
  employeeId: string,
  offset: number,
  pageSize: number
): Promise<{ records: Notification[]; hasMore: boolean }> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('recipient_id', employeeId)
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize);
  if (error) throw error;
  const rows = (data ?? []) as Notification[];
  const hasMore = rows.length > pageSize;
  return { records: hasMore ? rows.slice(0, pageSize) : rows, hasMore };
}

// Small, deliberately unpaginated count query for the header bell's badge
// — `head: true` never transfers row data, just the count.
export async function getUnreadCount(employeeId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', employeeId)
    .is('read_at', null);
  if (error) throw error;
  return count ?? 0;
}

export async function markAsRead(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function markAllAsRead(employeeId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', employeeId)
    .is('read_at', null);
  if (error) throw error;
}
