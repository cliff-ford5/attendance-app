import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Button, Dialog, FAB, IconButton, List, Portal, Text } from 'react-native-paper';
import { ErrorState, LoadingState } from '@/components/ScreenState';
import { useLocations } from '../hooks/useLocations';
import type { Location } from '../types';

export function LocationsScreen() {
  const router = useRouter();
  const { locations, loading, error, deletingId, remove, reload } = useLocations();
  const [pendingDelete, setPendingDelete] = useState<Location | null>(null);

  if (loading) return <LoadingState label="Loading locations…" />;
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
        data={locations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <List.Item
            title={item.name}
            description={`${item.latitude.toFixed(5)}, ${item.longitude.toFixed(5)} · ${item.radius_meters}m radius\n${item.expected_start}–${item.expected_end}`}
            descriptionNumberOfLines={2}
            left={(props) => <List.Icon {...props} icon="map-marker-outline" />}
            right={(props) => (
              <View style={[styles.rowActions, props.style]}>
                <IconButton
                  icon="pencil-outline"
                  size={18}
                  style={styles.rowIconButton}
                  onPress={() => router.push({ pathname: '/(admin)/staff/location-form', params: { id: item.id } })}
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
            onPress={() => router.push({ pathname: '/(admin)/staff/location-form', params: { id: item.id } })}
          />
        )}
        contentContainerStyle={styles.listContent}
      />
      <FAB icon="plus" label="Add location" style={styles.fab} onPress={() => router.push('/(admin)/staff/location-form')} />

      <Portal>
        <Dialog visible={pendingDelete !== null} onDismiss={() => setPendingDelete(null)}>
          <Dialog.Title>Delete "{pendingDelete?.name}"?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              This can't be undone. If any employees are still assigned here, the delete will fail until they're
              reassigned.
            </Text>
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
