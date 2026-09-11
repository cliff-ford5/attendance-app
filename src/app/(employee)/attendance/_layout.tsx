import { router, Stack } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { useAuth } from '@/features/auth/hooks/useAuth';

// Nested stack (same pattern as (admin)/staff/_layout.tsx) so tapping a
// past attendance record can drill into a detail screen while "Attendance"
// stays a single bottom tab.
export default function AttendanceStackLayout() {
  const { signOut } = useAuth();
  const logoutAction = [{ icon: 'logout', onPress: () => signOut(), accessibilityLabel: 'Sign out' }];

  return (
    <Stack>
      <Stack.Screen name="index" options={{ header: () => <AppHeader title="Attendance" mode="large" actions={logoutAction} /> }} />
      <Stack.Screen name="[id]" options={{ header: () => <AppHeader title="Attendance details" onBack={() => router.back()} /> }} />
    </Stack>
  );
}
