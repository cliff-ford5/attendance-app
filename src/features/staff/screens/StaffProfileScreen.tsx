import DateTimePicker from '@react-native-community/datetimepicker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Platform, ScrollView, SectionList, StyleSheet, View } from 'react-native';
import { Card, Chip, Dialog, HelperText, IconButton, List, Menu, Portal, Text, useTheme, Button as PaperButton } from 'react-native-paper';
import { AppAvatar } from '@/components/AppAvatar';
import { AppHeader } from '@/components/AppHeader';
import { AppSegmentedButtons } from '@/components/AppSegmentedButtons';
import { AppTextInput as TextInput } from '@/components/AppTextInput';
import { ErrorState, LoadingState, NotConfiguredState } from '@/components/ScreenState';
import { isSupabaseConfigured } from '@/services/supabase';
import { AttendanceHistoryRow } from '@/features/attendance/components/AttendanceHistoryRow';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useMyAttendanceHistory } from '@/features/attendance/hooks/useMyAttendanceHistory';
import { useLocations } from '@/features/locations/hooks/useLocations';
import { DAY_LABELS, SCHEDULE_DAY_ORDER } from '@/features/schedule/constants';
import { useMySchedule } from '@/features/schedule/hooks/useMySchedule';
import { TaskCard } from '@/features/tasks/components/TaskCard';
import { useCreateTask } from '@/features/tasks/hooks/useCreateTask';
import { useMyTasks } from '@/features/tasks/hooks/useMyTasks';
import type { Task, TaskPriority } from '@/features/tasks/types';
import { openAndroidDateTimePicker } from '@/lib/androidDateTimePicker';
import { groupByDay } from '@/lib/groupByDay';
import { useEmployeeProfile } from '../hooks/useEmployeeProfile';

type ProfileTab = 'profile' | 'tasks' | 'shifts';

function defaultDeadline() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d;
}

export function StaffProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile: currentAdmin } = useAuth();
  const { employee, loading, error, saveError, savingLocation, setLocation, savingProfile, updateProfile, reload } =
    useEmployeeProfile(id);
  const {
    tasks,
    loading: loadingTasks,
    error: tasksError,
    updatingId,
    deletingId,
    setStatus,
    edit: editTask,
    remove: removeTask,
    reload: reloadTasks,
  } = useMyTasks(id);
  const {
    records: attendanceRecords,
    loading: loadingAttendance,
    loadingMore: loadingMoreAttendance,
    hasMore: hasMoreAttendance,
    loadMore: loadMoreAttendance,
  } = useMyAttendanceHistory(id);
  const { days: scheduleDays, hasSavedSchedule, loading: loadingSchedule } = useMySchedule(id);
  const { create, submitting, error: createError } = useCreateTask(currentAdmin?.id);
  const { locations, loading: loadingLocations } = useLocations();

  const [tab, setTab] = useState<ProfileTab>('profile');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [deadline, setDeadline] = useState(defaultDeadline());
  const [pickerVisible, setPickerVisible] = useState(false);
  const [locationMenuVisible, setLocationMenuVisible] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [pendingDeleteTask, setPendingDeleteTask] = useState<Task | null>(null);

  const [editingProfile, setEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profilePosition, setProfilePosition] = useState('');
  const [profileDepartment, setProfileDepartment] = useState('');
  const [profileMobile, setProfileMobile] = useState('');

  // Overrides the static "Profile" title the parent Stack sets — once the
  // employee's loaded, the header shows who you're actually looking at
  // instead of a generic label, same reasoning most drill-in profile
  // screens (Contacts, Slack DMs, etc.) show the person's name up top.
  const header = <Stack.Screen options={{ header: () => <AppHeader title={employee?.name ?? 'Profile'} onBack={() => router.back()} /> }} />;

  if (!isSupabaseConfigured)
    return (
      <>
        {header}
        <NotConfiguredState />
      </>
    );
  if (loading)
    return (
      <>
        {header}
        <LoadingState label="Loading profile…" />
      </>
    );
  if (error || !employee)
    return (
      <>
        {header}
        <ErrorState message={error ?? 'Employee not found.'} onRetry={reload} />
      </>
    );

  function resetTaskForm() {
    setEditingTaskId(null);
    setTitle('');
    setDescription('');
    setPriority('medium');
    setDeadline(defaultDeadline());
  }

  async function handleAssign() {
    if (!id || title.trim().length === 0) return;
    if (editingTaskId) {
      const ok = await editTask(editingTaskId, { title: title.trim(), description: description.trim(), deadline, priority });
      if (ok) resetTaskForm();
      return;
    }
    const ok = await create({ title: title.trim(), description: description.trim(), assignedTo: id, deadline, priority });
    if (ok) {
      resetTaskForm();
      reloadTasks();
    }
  }

  function startEditTask(task: Task) {
    setEditingTaskId(task.id);
    setTitle(task.title);
    setDescription(task.description ?? '');
    setPriority(task.priority);
    setDeadline(new Date(task.deadline));
  }

  async function confirmDeleteTask() {
    if (!pendingDeleteTask) return;
    await removeTask(pendingDeleteTask.id);
    setPendingDeleteTask(null);
  }

  function startEditProfile() {
    if (!employee) return;
    setProfileName(employee.name);
    setProfilePosition(employee.position ?? '');
    setProfileDepartment(employee.department ?? '');
    setProfileMobile(employee.mobile_number ?? '');
    setEditingProfile(true);
  }

  async function saveProfile() {
    if (profileName.trim().length === 0) return;
    const ok = await updateProfile({
      name: profileName,
      position: profilePosition,
      department: profileDepartment,
      mobile_number: profileMobile,
    });
    if (ok) setEditingProfile(false);
  }

  const firstName = employee.name.split(' ')[0];

  return (
    <View style={styles.container}>
      {header}
      <View style={styles.identityRow}>
        <AppAvatar name={employee.name} avatarPath={employee.avatar_path} size={48} />
        <View style={styles.identityText}>
          <Text variant="titleMedium">{employee.name}</Text>
          <Text variant="bodySmall" style={styles.subtitle}>
            {employee.position || 'No position set'}
            {employee.department ? ` · ${employee.department}` : ''}
          </Text>
        </View>
      </View>

      <AppSegmentedButtons
        value={tab}
        onValueChange={(v) => setTab(v as ProfileTab)}
        style={styles.tabs}
        buttons={[
          { value: 'profile', label: 'Profile', icon: 'account-outline' },
          { value: 'tasks', label: `Tasks (${tasks.length})`, icon: 'clipboard-list-outline' },
          // "Shifts & Attendance" truncated mid-word at this control's
          // per-segment width ("Shifts & Attendace...") — shortened to one
          // word + an icon rather than the full phrase, same length budget
          // every other SegmentedButtons label in this app already keeps to.
          { value: 'shifts', label: 'Attendance', icon: 'calendar-clock-outline' },
        ]}
      />

      {tab === 'profile' && (
        <ScrollView contentContainerStyle={styles.listContent}>
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.cardHeaderRow}>
                <Text variant="labelLarge" style={styles.fieldLabel}>
                  Details
                </Text>
                {!editingProfile && (
                  <IconButton
                    icon="pencil-outline"
                    size={18}
                    style={styles.editIcon}
                    onPress={startEditProfile}
                    accessibilityLabel="Edit profile details"
                  />
                )}
              </View>

              {editingProfile ? (
                <>
                  <TextInput label="Name" value={profileName} onChangeText={setProfileName} style={styles.input} />
                  <TextInput label="Position" value={profilePosition} onChangeText={setProfilePosition} style={styles.input} />
                  <TextInput label="Department" value={profileDepartment} onChangeText={setProfileDepartment} style={styles.input} />
                  <TextInput
                    label="Mobile number"
                    value={profileMobile}
                    onChangeText={setProfileMobile}
                    keyboardType="phone-pad"
                    style={styles.input}
                  />
                  <View style={styles.editActionsRow}>
                    <PaperButton mode="text" onPress={() => setEditingProfile(false)} disabled={savingProfile}>
                      Cancel
                    </PaperButton>
                    <PaperButton
                      mode="contained"
                      onPress={saveProfile}
                      loading={savingProfile}
                      disabled={savingProfile || profileName.trim().length === 0}
                    >
                      Save
                    </PaperButton>
                  </View>
                </>
              ) : (
                <View style={styles.chipRow}>
                  <Chip compact icon="email-outline">
                    {employee.email}
                  </Chip>
                  {employee.mobile_number && <Chip compact icon="phone-outline">{employee.mobile_number}</Chip>}
                  {!employee.active && (
                    <Chip compact icon="account-off-outline">
                      Inactive
                    </Chip>
                  )}
                </View>
              )}

              <Text variant="labelLarge" style={styles.fieldLabel}>
                Assigned location
              </Text>
              <Menu
                visible={locationMenuVisible}
                onDismiss={() => setLocationMenuVisible(false)}
                anchor={
                  <PaperButton
                    mode="outlined"
                    icon="map-marker-outline"
                    textColor={theme.colors.onSurface}
                    onPress={() => setLocationMenuVisible(true)}
                    loading={savingLocation}
                    disabled={savingLocation || loadingLocations}
                    style={styles.locationButton}
                  >
                    {locations.find((l) => l.id === employee.location_id)?.name ?? 'No location assigned'}
                  </PaperButton>
                }
              >
                {locations.map((l) => (
                  <Menu.Item
                    key={l.id}
                    title={l.name}
                    onPress={() => {
                      setLocation(l.id);
                      setLocationMenuVisible(false);
                    }}
                  />
                ))}
                {locations.length === 0 && <Menu.Item title="No locations yet — add one first" disabled />}
              </Menu>
              {saveError && <HelperText type="error">{saveError}</HelperText>}
            </Card.Content>
          </Card>
        </ScrollView>
      )}

      {tab === 'tasks' && (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <View>
              <Card style={styles.card}>
                <Card.Content>
                  <Text variant="titleMedium" style={styles.formTitle}>
                    {editingTaskId ? `Edit task for ${firstName}` : `Assign a task to ${firstName}`}
                  </Text>

                  <TextInput label="Task name" value={title} onChangeText={setTitle} style={styles.input} />
                  <TextInput
                    label="Description (optional)"
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    style={styles.input}
                  />

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

                  <PaperButton
                    mode="outlined"
                    icon="calendar-clock-outline"
                    textColor={theme.colors.onSurface}
                    onPress={() => (Platform.OS === 'android' ? openAndroidDateTimePicker(deadline, setDeadline) : setPickerVisible(true))}
                    style={styles.input}
                  >
                    Deadline: {deadline.toLocaleString()}
                  </PaperButton>
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

                  {(editingTaskId ? tasksError : createError) && (
                    <HelperText type="error">{editingTaskId ? tasksError : createError}</HelperText>
                  )}

                  <View style={styles.editActionsRow}>
                    {editingTaskId && (
                      <PaperButton mode="text" onPress={resetTaskForm} disabled={updatingId === editingTaskId}>
                        Cancel edit
                      </PaperButton>
                    )}
                    <PaperButton
                      mode="contained"
                      onPress={handleAssign}
                      loading={editingTaskId ? updatingId === editingTaskId : submitting}
                      disabled={(editingTaskId ? updatingId === editingTaskId : submitting) || title.trim().length === 0}
                    >
                      {editingTaskId ? 'Save changes' : 'Assign task'}
                    </PaperButton>
                  </View>
                </Card.Content>
              </Card>

              <Text variant="titleMedium" style={styles.sectionTitle}>
                Tasks assigned to {firstName}
              </Text>
              {!loadingTasks && tasks.length === 0 && <Text style={styles.emptyState}>No tasks yet.</Text>}
            </View>
          }
          renderItem={({ item }) => (
            <TaskCard
              task={item}
              busy={updatingId === item.id || deletingId === item.id}
              onAdvance={item.status === 'done' ? undefined : () => setStatus(item.id, item.status === 'assigned' ? 'in_progress' : 'done')}
              onEdit={() => startEditTask(item)}
              onDelete={() => setPendingDeleteTask(item)}
            />
          )}
          contentContainerStyle={styles.listContent}
        />
      )}

      {tab === 'shifts' && (
        <SectionList
          sections={groupByDay(attendanceRecords)}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <View>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Weekly schedule
              </Text>
              {loadingSchedule ? (
                <LoadingState label="Loading schedule…" />
              ) : !hasSavedSchedule ? (
                <Text style={styles.emptyState}>{firstName} hasn't set a schedule yet.</Text>
              ) : (
                SCHEDULE_DAY_ORDER.map((dayOfWeek) => {
                  const day = scheduleDays.find((d) => d.dayOfWeek === dayOfWeek)!;
                  return (
                    <List.Item
                      key={dayOfWeek}
                      title={DAY_LABELS[dayOfWeek]}
                      description={day.isDayOff ? 'Day off' : `${day.startTime} – ${day.endTime}`}
                      left={(props) => (
                        <List.Icon {...props} icon={day.isDayOff ? 'calendar-remove-outline' : 'calendar-clock-outline'} />
                      )}
                    />
                  );
                })
              )}

              <Text variant="titleMedium" style={styles.sectionTitle}>
                Attendance history
              </Text>
              {loadingAttendance && <LoadingState label="Loading attendance…" />}
              {!loadingAttendance && attendanceRecords.length === 0 && (
                <Text style={styles.emptyState}>No attendance records yet.</Text>
              )}
            </View>
          }
          renderSectionHeader={({ section }) => (
            <View style={[styles.attendanceSectionHeader, { backgroundColor: theme.colors.background }]}>
              <Text variant="labelLarge" style={styles.attendanceSectionTitle}>
                {section.title}
              </Text>
            </View>
          )}
          renderItem={({ item }) => <AttendanceHistoryRow record={item} />}
          onEndReached={loadMoreAttendance}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMoreAttendance ? (
              <LoadingState label="Loading more…" />
            ) : !hasMoreAttendance && attendanceRecords.length > 0 ? (
              <Text style={styles.emptyState}>No more records.</Text>
            ) : null
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      <Portal>
        <Dialog visible={pendingDeleteTask !== null} onDismiss={() => setPendingDeleteTask(null)}>
          <Dialog.Title>Delete "{pendingDeleteTask?.title}"?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">This removes the task for {firstName} entirely. This can't be undone.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <PaperButton onPress={() => setPendingDeleteTask(null)}>Cancel</PaperButton>
            <PaperButton onPress={confirmDeleteTask} loading={deletingId === pendingDeleteTask?.id}>
              Delete
            </PaperButton>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  identityText: {
    flex: 1,
  },
  subtitle: {
    marginTop: 2,
    opacity: 0.7,
  },
  tabs: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fieldLabel: {
    marginTop: 16,
    marginBottom: 6,
    opacity: 0.7,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editIcon: {
    margin: 0,
  },
  editActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  locationButton: {
    alignSelf: 'flex-start',
  },
  formTitle: {
    marginBottom: 12,
  },
  input: {
    marginBottom: 12,
  },
  sectionTitle: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  emptyState: {
    paddingHorizontal: 16,
    opacity: 0.6,
  },
  listContent: {
    paddingBottom: 24,
  },
  attendanceSectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 2,
  },
  attendanceSectionTitle: {
    opacity: 0.6,
  },
});
