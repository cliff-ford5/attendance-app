import { supabase } from '@/services/supabase';
import type { WeeklyScheduleEntry } from '@/types/database';
import type { DaySchedule } from '../types';

export async function getScheduleForEmployee(employeeId: string): Promise<WeeklyScheduleEntry[]> {
  const { data, error } = await supabase
    .from('weekly_schedules')
    .select('*')
    .eq('employee_id', employeeId)
    .order('day_of_week', { ascending: true });
  if (error) throw error;
  return (data ?? []) as WeeklyScheduleEntry[];
}

// Always upserts all 7 days together — the UI always holds a full week in
// state, so there's no reason to support a partial save.
export async function saveSchedule(employeeId: string, days: DaySchedule[]): Promise<WeeklyScheduleEntry[]> {
  const rows = days.map((d) => ({
    employee_id: employeeId,
    day_of_week: d.dayOfWeek,
    is_day_off: d.isDayOff,
    start_time: d.isDayOff ? null : d.startTime,
    end_time: d.isDayOff ? null : d.endTime,
    updated_at: new Date().toISOString(),
  }));
  const { data, error } = await supabase
    .from('weekly_schedules')
    .upsert(rows, { onConflict: 'employee_id,day_of_week' })
    .select('*');
  if (error) throw error;
  return (data ?? []) as WeeklyScheduleEntry[];
}
