import { StyleSheet, View } from 'react-native';
import { Card, Chip, Icon, IconButton, Text } from 'react-native-paper';
import { AppSegmentedButtons } from '@/components/AppSegmentedButtons';
import { statusColors } from '@/constants/theme';
import { isOverdue, type Task, type TaskPriority, type TaskStatus } from '../types';

const STATUS_LABEL: Record<TaskStatus, string> = {
  assigned: 'Assigned',
  in_progress: 'In progress',
  done: 'Done',
};

const STATUS_COLOR: Record<TaskStatus, string> = {
  assigned: statusColors.neutral,
  in_progress: statusColors.warning,
  done: statusColors.success,
};

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: 'Low priority',
  medium: 'Medium priority',
  high: 'High priority',
};

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  low: statusColors.neutral,
  medium: statusColors.warning,
  high: statusColors.danger,
};

export function TaskCard({
  task,
  assigneeName,
  onStatusChange,
  onEdit,
  onDelete,
  busy,
}: {
  task: Task;
  assigneeName?: string;
  // A direct 3-way status picker, not a single "advance" button — a task
  // marked done by mistake needs to go backward just as easily as forward,
  // and RLS (`tasks_update_assignee_or_admin`) already allows setting any
  // status, so the old forward-only button was purely a UI restriction the
  // data never actually had.
  onStatusChange?: (status: TaskStatus) => void;
  // Admin-only actions (wired from StaffProfileScreen, where tasks are
  // assigned in the first place) — omitted everywhere else this card
  // renders (the employee's own task list, the admin's read-only overview).
  onEdit?: () => void;
  onDelete?: () => void;
  busy?: boolean;
}) {
  const overdue = isOverdue(task);

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.headerRow}>
          <Text variant="titleMedium" style={styles.title}>
            {task.title}
          </Text>
          <View style={styles.headerActions}>
            <Chip
              compact
              style={{ backgroundColor: overdue ? statusColors.danger : STATUS_COLOR[task.status] }}
              textStyle={styles.chipText}
            >
              {overdue ? 'Overdue' : STATUS_LABEL[task.status]}
            </Chip>
            {onEdit && (
              <IconButton icon="pencil-outline" size={16} style={styles.iconButton} onPress={onEdit} accessibilityLabel="Edit task" />
            )}
            {onDelete && (
              <IconButton
                icon="trash-can-outline"
                size={16}
                style={styles.iconButton}
                onPress={onDelete}
                accessibilityLabel="Delete task"
              />
            )}
          </View>
        </View>

        {task.description ? (
          <Text variant="bodyMedium" style={styles.description}>
            {task.description}
          </Text>
        ) : null}

        {assigneeName && (
          <Text variant="bodySmall" style={styles.meta}>
            Assigned to {assigneeName}
          </Text>
        )}
        <Text variant="bodySmall" style={styles.meta}>
          Due {new Date(task.deadline).toLocaleString()}
        </Text>
        <View style={styles.priorityRow}>
          <Icon source="flag" size={14} color={PRIORITY_COLOR[task.priority]} />
          <Text variant="bodySmall" style={[styles.meta, styles.priorityText, { color: PRIORITY_COLOR[task.priority] }]}>
            {PRIORITY_LABEL[task.priority]}
          </Text>
        </View>

        {onStatusChange && (
          <AppSegmentedButtons
            value={task.status}
            onValueChange={(v) => onStatusChange(v as TaskStatus)}
            style={styles.button}
            buttons={[
              { value: 'assigned', label: 'Assigned', disabled: busy },
              { value: 'in_progress', label: 'In progress', disabled: busy },
              { value: 'done', label: 'Done', disabled: busy },
            ]}
          />
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  iconButton: {
    margin: 0,
    marginLeft: -4,
  },
  title: {
    flexShrink: 1,
  },
  description: {
    marginTop: 6,
    opacity: 0.8,
  },
  meta: {
    marginTop: 8,
    opacity: 0.6,
  },
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priorityText: {
    marginTop: 0,
    opacity: 1,
  },
  chipText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  button: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
});
