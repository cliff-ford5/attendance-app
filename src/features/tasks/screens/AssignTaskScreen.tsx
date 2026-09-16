import DateTimePicker from '@react-native-community/datetimepicker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet } from 'react-native';
import { Button, Dialog, Divider, HelperText, List, Portal, Searchbar, Text, useTheme } from 'react-native-paper';
import { AppHeader } from '@/components/AppHeader';
import { AppSegmentedButtons } from '@/components/AppSegmentedButtons';
import { AppTextInput as TextInput } from '@/components/AppTextInput';
import { useAuth } from '@/features/auth/hooks/useAuth';
import * as staffService from '@/features/staff/services/staffService';
import type { Employee } from '@/types/database';
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
  const { tasks, updatingId, edit: editTask, reassign, reload: reloadTasks } = useMyTasks(employeeId);
  const { create, submitting, error: createError } = useCreateTask(currentAdmin?.id);

  const editingTask = taskId ? tasks.find((t) => t.id === taskId) : undefined;
  const isEditing = Boolean(taskId);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [deadline, setDeadline] = useState(defaultDeadline());
  const [pickerVisible, setPickerVisible] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Correcting who a task belongs to is a genuinely different action from
  // assigning one in the first place — that's deliberately implicit from
  // which employee's profile you're on (CLAUDE.md's Task assignment
  // section), with no employee picker anywhere. Reassignment has no
  // "implicit" employee to fall back on once a task already belongs to
  // someone else, so it's the one place in this feature that needs an
  // explicit picker — only reachable from editing an existing task, never
  // from creating one.
  const [reassignVisible, setReassignVisible] = useState(false);
  const [reassignSearch, setReassignSearch] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [reassigning, setReassigning] = useState(false);
  const [reassignError, setReassignError] = useState<string | null>(null);

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

  async function openReassignPicker() {
    setReassignError(null);
    setReassignSearch('');
    setReassignVisible(true);
    if (employees.length === 0) {
      setLoadingEmployees(true);
      try {
        setEmployees(await staffService.getAllEmployees());
      } catch {
        setReassignError('Could not load staff.');
      } finally {
        setLoadingEmployees(false);
      }
    }
  }

  async function handleReassign(newEmployeeId: string) {
    if (!taskId) return;
    setReassigning(true);
    setReassignError(null);
    try {
      const ok = await reassign(taskId, newEmployeeId);
      if (ok) {
        // The task no longer belongs to `employeeId` once reassigned —
        // nothing left to edit in this screen's context, so close it
        // rather than continue showing a now-stale form.
        router.back();
      } else {
        setReassignError('Could not reassign this task.');
      }
    } finally {
      setReassigning(false);
    }
  }

  const filteredEmployees = useMemo(() => {
    const q = reassignSearch.trim().toLowerCase();
    return employees.filter((e) => e.id !== employeeId && (!q || e.name.toLowerCase().includes(q)));
  }, [employees, reassignSearch, employeeId]);

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

      {isEditing && (
        <>
          <Divider style={styles.divider} />
          <Text variant="labelLarge" style={styles.reassignLabel}>
            Currently assigned to {firstName}
          </Text>
          <Button mode="outlined" icon="account-switch-outline" textColor={theme.colors.onSurface} onPress={openReassignPicker}>
            Reassign to someone else
          </Button>
        </>
      )}

      <Portal>
        <Dialog visible={reassignVisible} onDismiss={() => setReassignVisible(false)} style={styles.dialog}>
          <Dialog.Title>Reassign task</Dialog.Title>
          <Dialog.Content>
            <Searchbar placeholder="Search staff" value={reassignSearch} onChangeText={setReassignSearch} style={styles.searchbar} />
            {reassignError && <HelperText type="error">{reassignError}</HelperText>}
          </Dialog.Content>
          <ScrollView style={styles.employeeList}>
            {loadingEmployees ? (
              <Text style={styles.emptyHint}>Loading…</Text>
            ) : filteredEmployees.length === 0 ? (
              <Text style={styles.emptyHint}>No staff match this search.</Text>
            ) : (
              filteredEmployees.map((e) => (
                <List.Item
                  key={e.id}
                  title={e.name}
                  description={e.position || e.department || e.email}
                  onPress={() => handleReassign(e.id)}
                  disabled={reassigning}
                />
              ))
            )}
          </ScrollView>
          <Dialog.Actions>
            <Button onPress={() => setReassignVisible(false)} disabled={reassigning}>
              Cancel
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  divider: {
    marginVertical: 20,
  },
  reassignLabel: {
    marginBottom: 8,
    opacity: 0.7,
  },
  dialog: {
    maxHeight: '80%',
  },
  searchbar: {
    marginBottom: 4,
  },
  employeeList: {
    maxHeight: 320,
    paddingHorizontal: 8,
  },
  emptyHint: {
    textAlign: 'center',
    paddingVertical: 16,
    opacity: 0.6,
  },
});
