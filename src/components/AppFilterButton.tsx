import { Button } from 'react-native-paper';

// The single compact trigger for this app's filter pattern (see
// AppFilterSheet) — replaces the old per-screen chip rows (Leave, Tasks,
// Staff Attendance), which forced single-select chips onto data that
// wasn't actually mutually exclusive (attendance flags, "Overdue" as an
// independent computed status) and visibly broke when a row of chips
// wrapped unevenly. One button, never wraps, scales to any number of
// filter options without the screen getting more cluttered.
export function AppFilterButton({
  activeCount,
  onPress,
  label = 'Filters',
}: {
  activeCount: number;
  onPress: () => void;
  label?: string;
}) {
  return (
    <Button mode="outlined" icon="filter-variant" onPress={onPress} compact>
      {activeCount > 0 ? `${label} (${activeCount})` : label}
    </Button>
  );
}
