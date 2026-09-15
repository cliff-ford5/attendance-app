import { router, Stack } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';

// Nested stack (same pattern as (employee)/attendance/_layout.tsx) so the
// "+" FAB can push a modal-presented form screen while "Leave" stays a
// single bottom tab.
export default function LeaveStackLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ header: () => <AppHeader title="Leave" mode="medium" accountMenu /> }} />
      <Stack.Screen
        name="new"
        options={{
          presentation: 'modal',
          header: () => <AppHeader title="Request Time Off" onClose={() => router.back()} />,
        }}
      />
    </Stack>
  );
}
