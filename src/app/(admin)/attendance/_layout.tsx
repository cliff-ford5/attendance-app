import { router, Stack } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';

// Nested stack (same pattern as (admin)/staff/_layout.tsx and
// (employee)/attendance/_layout.tsx) so tapping a record from either
// "Checked in" or "Recent history" can drill into a detail screen — and
// from there, an admin can open the edit form — while "Attendance" stays a
// single bottom tab. [id]'s own header is decided inside
// AttendanceDetailScreen itself (it needs to conditionally show an Edit
// action for admins only), so no header override is set for it here.
export default function AttendanceStackLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ header: () => <AppHeader title="Attendance" mode="medium" accountMenu /> }} />
      <Stack.Screen name="[id]" />
      <Stack.Screen
        name="edit"
        options={{ presentation: 'modal', header: () => <AppHeader title="Edit attendance" onClose={() => router.back()} /> }}
      />
    </Stack>
  );
}
