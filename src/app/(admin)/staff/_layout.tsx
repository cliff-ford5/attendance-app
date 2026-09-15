import { router, Stack } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';

export default function StaffStackLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          header: () => (
            <AppHeader
              title="Staff"
              mode="medium"
              actions={[
                { icon: 'map-marker-outline', onPress: () => router.push('/(admin)/staff/locations'), accessibilityLabel: 'Locations' },
                { icon: 'calendar-star', onPress: () => router.push('/(admin)/staff/holidays'), accessibilityLabel: 'Holidays' },
              ]}
              accountMenu
            />
          ),
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{ header: () => <AppHeader title="Profile" onBack={() => router.back()} /> }}
      />
      <Stack.Screen
        name="locations"
        options={{ header: () => <AppHeader title="Locations" onBack={() => router.back()} /> }}
      />
      <Stack.Screen
        name="task"
        options={{
          presentation: 'modal',
          header: () => <AppHeader title="Assign Task" onClose={() => router.back()} />,
        }}
      />
      <Stack.Screen
        name="location-form"
        options={{
          presentation: 'modal',
          header: () => <AppHeader title="Add Location" onClose={() => router.back()} />,
        }}
      />
      <Stack.Screen
        name="holidays"
        options={{ header: () => <AppHeader title="Holidays" onBack={() => router.back()} /> }}
      />
      <Stack.Screen
        name="holiday-form"
        options={{
          presentation: 'modal',
          header: () => <AppHeader title="Add Holiday" onClose={() => router.back()} />,
        }}
      />
    </Stack>
  );
}
