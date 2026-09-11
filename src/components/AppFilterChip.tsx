import type { ComponentProps } from 'react';
import { Chip, useTheme } from 'react-native-paper';

// Same fix as AppSegmentedButtons, same reason: Paper's Chip colors its
// `selected` state with secondaryContainer/onSecondaryContainer by default
// too — this app reserves that pair for static avatar backgrounds, coral
// is what "selected" means everywhere else. Used for filter chips
// (TasksOverviewScreen, LeaveApprovalsScreen) — plain status-display chips
// elsewhere in the app don't use `selected` at all, so they're unaffected.
export function AppFilterChip(props: ComponentProps<typeof Chip>) {
  const theme = useTheme();
  return (
    <Chip
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
