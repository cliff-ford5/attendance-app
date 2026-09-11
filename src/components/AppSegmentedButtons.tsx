import type { ComponentProps } from 'react';
import { SegmentedButtons, useTheme } from 'react-native-paper';

// Paper's SegmentedButtons colors its checked segment with
// secondaryContainer/onSecondaryContainer (MD3's real default) — this app
// deliberately keeps secondaryContainer (teal) reserved for a different,
// unrelated purpose: static avatar backgrounds, specifically so they don't
// look like tappable buttons (see ARCHITECTURE.md's Theming section,
// "Color roles, not just a palette"). Coral (primary/primaryContainer) is
// what actually means "this is active/selected" everywhere else in the
// app — the bottom nav's active-tab pill in particular. Left on Paper's
// default, every SegmentedButtons in the app (Profile/Tasks/Attendance,
// Checked-in/Recent history, Full day/Half day, priority, leave type...)
// showed the wrong "selected" color relative to the rest of the UI's own
// convention. Remapping just these two tokens via Paper's `theme` prop
// (deep-merged with the ambient theme, so fonts/roundness/every other
// color are untouched) fixes it app-wide from one place, same "App*"
// wrapper pattern as AppHeader/AppTextInput/AppAvatar.
export function AppSegmentedButtons(props: ComponentProps<typeof SegmentedButtons>) {
  const theme = useTheme();
  return (
    <SegmentedButtons
      {...props}
      theme={{
        colors: {
          secondaryContainer: theme.colors.primaryContainer,
          onSecondaryContainer: theme.colors.onPrimaryContainer,
        },
      }}
    />
  );
}
