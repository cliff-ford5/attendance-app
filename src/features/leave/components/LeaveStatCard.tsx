import { StyleSheet } from 'react-native';
import { Card, Text } from 'react-native-paper';

// Bordered/outlined rather than filled — these are informational counts,
// not actions, so they stay off `primary` (reserved for real actions
// elsewhere in the app) and instead borrow the same status colors already
// used for a request's status chip, just applied as an outline here.
export function LeaveStatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <Card style={[styles.card, { borderColor: color }]} mode="outlined">
      <Card.Content>
        <Text variant="headlineSmall" style={{ color }}>
          {value}
        </Text>
        <Text variant="labelMedium" style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexBasis: '48%',
    flexGrow: 1,
    borderWidth: 1.5,
  },
  label: {
    marginTop: 4,
    opacity: 0.7,
  },
});
