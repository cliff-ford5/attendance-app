import { router, Stack } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';

// Nested stack (same pattern as (admin)/staff/_layout.tsx) so tapping a
// past attendance record can drill into a detail screen while "Attendance"
// stays a single bottom tab.
export default function AttendanceStackLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ header: () => <AppHeader title="Attendance" mode="medium" accountMenu /> }} />
      <Stack.Screen name="[id]" options={{ header: () => <AppHeader title="Attendance details" onBack={() => router.back()} /> }} />
    </Stack>
  );
}
