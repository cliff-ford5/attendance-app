import { router, Stack } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { useAuth } from '@/features/auth/hooks/useAuth';

export default function StaffStackLayout() {
  const { signOut } = useAuth();

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          header: () => (
            <AppHeader
              title="Staff"
              mode="large"
              actions={[
                { icon: 'map-marker-outline', onPress: () => router.push('/(admin)/staff/locations'), accessibilityLabel: 'Locations' },
                { icon: 'logout', onPress: () => signOut(), accessibilityLabel: 'Sign out' },
              ]}
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
    </Stack>
  );
}
