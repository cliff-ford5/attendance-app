import { supabase } from '@/services/supabase';
import type { Task, TaskPriority, TaskStatus } from '@/types/database';
import type { NewTaskInput, TaskWithAssignee, TaskWithAssigner } from '../types';

// Joins the assigner's name — shown on the employee's own task list so
// they know who actually gave them the task, not just what it is. Also
// used by StaffProfileScreen's admin per-employee tab (same hook, same
// query), where it's equally useful if more than one admin assigns tasks.
export async function getMyTasks(employeeId: string): Promise<TaskWithAssigner[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, assigner:employees!tasks_assigned_by_fkey(id, name)')
    .eq('assigned_to', employeeId)
    .order('deadline', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as TaskWithAssigner[];
}

export async function getAllTasks(): Promise<TaskWithAssignee[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, assignee:employees!tasks_assigned_to_fkey(id, name)')
    .order('deadline', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as TaskWithAssignee[];
}

export async function createTask(input: NewTaskInput, assignedBy: string): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title: input.title,
      description: input.description || null,
      assigned_to: input.assignedTo,
      assigned_by: assignedBy,
      deadline: input.deadline.toISOString(),
      priority: input.priority,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as Task;
}

export async function updateTaskStatus(taskId: string, status: TaskStatus): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update({
      status,
      completed_at: status === 'done' ? new Date().toISOString() : null,
    })
    .eq('id', taskId)
    .select('*')
    .single();
  if (error) throw error;
  return data as Task;
}

export type TaskEditInput = {
  title: string;
  description: string;
  deadline: Date;
  priority: TaskPriority;
};

// Fixing a typo in the title/description, or a wrong deadline/priority —
// previously the only way to change a task after creation was to advance
// its status; there was no way to correct a mistake at all.
export async function updateTask(taskId: string, input: TaskEditInput): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update({
      title: input.title,
      description: input.description || null,
      deadline: input.deadline.toISOString(),
      priority: input.priority,
    })
    .eq('id', taskId)
    .select('*')
    .single();
  if (error) throw error;
  return data as Task;
}

export async function deleteTask(taskId: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  if (error) throw error;
}

// Admin-only in practice (RLS: tasks_update_assignee_or_admin, plus
// 0029's tasks_restrict_self_update trigger blocks a non-admin from
// touching assigned_to at all). Previously the only fix for a task
// assigned to the wrong person was delete and recreate.
export async function reassignTask(taskId: string, newAssignedTo: string): Promise<Task> {
  const { data, error } = await supabase.from('tasks').update({ assigned_to: newAssignedTo }).eq('id', taskId).select('*').single();
  if (error) throw error;
  return data as Task;
}
