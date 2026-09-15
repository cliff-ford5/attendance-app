import { StyleSheet } from 'react-native';
import { Card, Text } from 'react-native-paper';

// A soft tinted fill instead of a white card with just a colored outline —
// these are informational counts, not actions, so still off `primary`
// (reserved for real actions elsewhere), but a filled wash reads livelier
// than an outline while staying calm enough not to compete with real CTAs.
export function LeaveStatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <Card mode="contained" style={[styles.card, { backgroundColor: `${color}17` }]}>
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
  },
  label: {
    marginTop: 4,
    opacity: 0.7,
  },
});
