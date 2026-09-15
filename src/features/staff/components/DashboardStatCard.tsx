import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { Card, Text } from 'react-native-paper';

type Props = {
  label: string;
  value: number;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  onPress?: () => void;
};

export function DashboardStatCard({ label, value, icon, color, onPress }: Props) {
  return (
    <Card mode="contained" style={[styles.card, { backgroundColor: `${color}17` }]} onPress={onPress}>
      <Card.Content style={styles.content}>
        <View style={[styles.iconWrap, { backgroundColor: color }]}>
          <MaterialCommunityIcons name={icon} size={18} color="#FFFFFF" />
        </View>
        <Text variant="displaySmall">{value}</Text>
        <Text variant="bodySmall" style={styles.label} numberOfLines={2}>
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
  content: {
    gap: 4,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  label: {
    opacity: 0.7,
  },
});
