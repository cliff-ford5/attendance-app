import type { Employee, Task, TaskPriority, TaskStatus } from '@/types/database';

export type { Task, TaskPriority, TaskStatus };

export type TaskWithAssignee = Task & {
  assignee: Pick<Employee, 'id' | 'name'>;
};

export type NewTaskInput = {
  title: string;
  description: string;
  assignedTo: string;
  deadline: Date;
  priority: TaskPriority;
};

export function isOverdue(task: Pick<Task, 'deadline' | 'status'>): boolean {
  return task.status !== 'done' && new Date(task.deadline).getTime() < Date.now();
}
