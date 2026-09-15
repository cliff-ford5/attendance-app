import DateTimePicker from '@react-native-community/datetimepicker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet } from 'react-native';
import { Button, HelperText, useTheme } from 'react-native-paper';
import { AppHeader } from '@/components/AppHeader';
import { AppSegmentedButtons } from '@/components/AppSegmentedButtons';
import { AppTextInput as TextInput } from '@/components/AppTextInput';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { openAndroidDateTimePicker } from '@/lib/androidDateTimePicker';
import { useCreateTask } from '../hooks/useCreateTask';
import { useMyTasks } from '../hooks/useMyTasks';
import type { TaskPriority } from '../types';

function defaultDeadline() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d;
}

// Pulled out of StaffProfileScreen's Tasks tab (2026-09-14) — was an
// always-visible Card above the task list, doing double duty as both the
// add and edit form. Now its own modal-presented route; `taskId` (optional
// query param) switches it into edit mode, pre-filling from the same
// useMyTasks list the profile screen already loads (no separate
// get-task-by-id fetch needed — the employee's task list is already small).
export function AssignTaskScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { employeeId, employeeName, taskId } = useLocalSearchParams<{ employeeId: string; employeeName?: string; taskId?: string }>();
  const { profile: currentAdmin } = useAuth();
  const { tasks, updatingId, edit: editTask, reload: reloadTasks } = useMyTasks(employeeId);
  const { create, submitting, error: createError } = useCreateTask(currentAdmin?.id);

  const editingTask = taskId ? tasks.find((t) => t.id === taskId) : undefined;
  const isEditing = Boolean(taskId);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [deadline, setDeadline] = useState(defaultDeadline());
  const [pickerVisible, setPickerVisible] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Pre-fill once the task shows up in the list (it's already loading by
  // the time this screen mounts in the common case, but this covers a
  // fresh mount too).
  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description ?? '');
      setPriority(editingTask.priority);
      setDeadline(new Date(editingTask.deadline));
    }
  }, [editingTask]);

  const firstName = employeeName?.split(' ')[0] ?? 'this employee';
  const busy = isEditing ? updatingId === taskId : submitting;

  async function handleSubmit() {
    if (!employeeId || title.trim().length === 0) return;
    if (isEditing && taskId) {
      setEditError(null);
      const ok = await editTask(taskId, { title: title.trim(), description: description.trim(), deadline, priority });
      if (ok) router.back();
      else setEditError('Could not save changes to this task.');
      return;
    }
    const ok = await create({ title: title.trim(), description: description.trim(), assignedTo: employeeId, deadline, priority });
    if (ok) {
      reloadTasks();
      router.back();
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen
        options={{ header: () => <AppHeader title={isEditing ? 'Edit Task' : 'Assign Task'} onClose={() => router.back()} /> }}
      />
      <TextInput label="Task name" value={title} onChangeText={setTitle} style={styles.input} />
      <TextInput label="Description (optional)" value={description} onChangeText={setDescription} multiline style={styles.input} />

      <AppSegmentedButtons
        value={priority}
        onValueChange={(v) => setPriority(v as TaskPriority)}
        style={styles.input}
        buttons={[
          { value: 'low', label: 'Low' },
          { value: 'medium', label: 'Medium' },
          { value: 'high', label: 'High' },
        ]}
      />

      <Button
        mode="outlined"
        icon="calendar-clock-outline"
        textColor={theme.colors.onSurface}
        onPress={() => (Platform.OS === 'android' ? openAndroidDateTimePicker(deadline, setDeadline) : setPickerVisible(true))}
        style={styles.input}
      >
        Deadline: {deadline.toLocaleString()}
      </Button>
      {pickerVisible && Platform.OS !== 'android' && (
        <DateTimePicker
          value={deadline}
          mode="datetime"
          onChange={(_, selected) => {
            setPickerVisible(Platform.OS === 'ios');
            if (selected) setDeadline(selected);
          }}
        />
      )}

      {(isEditing ? editError : createError) && <HelperText type="error">{isEditing ? editError : createError}</HelperText>}

      <Button mode="contained" onPress={handleSubmit} loading={busy} disabled={busy || title.trim().length === 0}>
        {isEditing ? 'Save changes' : `Assign to ${firstName}`}
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  input: {
    marginBottom: 12,
  },
});
