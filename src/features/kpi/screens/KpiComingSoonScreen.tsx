import { StyleSheet, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';

// KPI formula hasn't been decided yet (deferred on purpose, see CLAUDE.md
// Open Questions) — this stub keeps the tab/nav structure in place without
// inventing a scoring model.
export function KpiComingSoonScreen() {
  return (
    <View style={styles.container}>
      <Icon source="chart-line" size={48} color="#9E9E9E" />
      <Text variant="titleMedium" style={styles.title}>
        KPI tracking is coming soon
      </Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        Performance scoring hasn't been defined yet — this will show once the KPI formula is decided.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  title: {
    marginTop: 8,
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.7,
  },
});
