import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Button, Dialog, FAB, IconButton, List, Portal, Text } from 'react-native-paper';
import { EmptyState, ErrorState, LoadingState } from '@/components/ScreenState';
import { useHolidays } from '../hooks/useHolidays';
import type { Holiday } from '../types';

function formatHolidayDate(dateOnly: string) {
  // `dateOnly` is a plain YYYY-MM-DD string (Postgres `date`, no time
  // component) — parsing it as local avoids the classic off-by-one-day bug
  // `new Date('2026-01-01')` has (parsed as UTC midnight, which renders as
  // the previous day in any timezone behind UTC).
  const [year, month, day] = dateOnly.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function HolidaysScreen() {
  const router = useRouter();
  const { holidays, loading, error, deletingId, remove, reload } = useHolidays();
  const [pendingDelete, setPendingDelete] = useState<Holiday | null>(null);

  if (loading) return <LoadingState label="Loading holidays…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  async function confirmDelete() {
    if (!pendingDelete) return;
    await remove(pendingDelete.id);
    setPendingDelete(null);
  }

  return (
    <View style={styles.flex}>
      <FlatList
        style={styles.flex}
        data={holidays}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<EmptyState message="No holidays added yet." />}
        renderItem={({ item }) => (
          <List.Item
            title={item.name}
            description={formatHolidayDate(item.date) + (item.blocks_check_in ? ' · Check-in blocked' : '')}
            left={(props) => <List.Icon {...props} icon="calendar-star" />}
            right={(props) => (
              <View style={[styles.rowActions, props.style]}>
                <IconButton
                  icon="pencil-outline"
                  size={18}
                  style={styles.rowIconButton}
                  onPress={() => router.push({ pathname: '/(admin)/staff/holiday-form', params: { id: item.id } })}
                  accessibilityLabel={`Edit ${item.name}`}
                />
                <IconButton
                  icon="trash-can-outline"
                  size={18}
                  style={styles.rowIconButton}
                  disabled={deletingId === item.id}
                  onPress={() => setPendingDelete(item)}
                  accessibilityLabel={`Delete ${item.name}`}
                />
              </View>
            )}
            onPress={() => router.push({ pathname: '/(admin)/staff/holiday-form', params: { id: item.id } })}
          />
        )}
        contentContainerStyle={styles.listContent}
      />
      <FAB icon="plus" label="Add holiday" style={styles.fab} onPress={() => router.push('/(admin)/staff/holiday-form')} />

      <Portal>
        <Dialog visible={pendingDelete !== null} onDismiss={() => setPendingDelete(null)}>
          <Dialog.Title>Delete "{pendingDelete?.name}"?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">This can't be undone.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPendingDelete(null)}>Cancel</Button>
            <Button onPress={confirmDelete} loading={deletingId === pendingDelete?.id}>
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 96,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowIconButton: {
    margin: 0,
  },
});
