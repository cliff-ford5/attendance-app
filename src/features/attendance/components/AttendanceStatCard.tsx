import { StyleSheet, View } from 'react-native';
import { Card, Icon, Text } from 'react-native-paper';

export function AttendanceStatCard({
  label,
  value,
  subtitle,
  icon,
  color,
}: {
  label: string;
  value: string;
  subtitle?: string;
  icon: string;
  color: string;
}) {
  return (
    // mode="contained" (MD3's flat filled variant, no elevation shadow) —
    // Paper's default "elevated" Card still casts its Android drop-shadow
    // even with a custom backgroundColor, which read as an odd gray halo
    // ringing each tinted card (confirmed by reading Card.js: elevation is
    // only zeroed for non-"elevated" modes).
    <Card mode="contained" style={[styles.card, { backgroundColor: `${color}17` }]}>
      <Card.Content>
        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: color }]}>
            <Icon source={icon} size={16} color="#FFFFFF" />
          </View>
          <Text variant="labelMedium" style={styles.label} numberOfLines={1}>
            {label}
          </Text>
        </View>
        <Text variant="titleLarge" style={styles.value} numberOfLines={1}>
          {value}
        </Text>
        {subtitle && (
          <Text variant="labelSmall" style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexBasis: '48%',
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    opacity: 0.7,
    flexShrink: 1,
  },
  value: {
    fontWeight: '600',
  },
  subtitle: {
    marginTop: 2,
    opacity: 0.6,
  },
});
