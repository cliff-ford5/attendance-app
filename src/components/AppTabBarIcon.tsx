import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ColorValue } from 'react-native';
import { StyleSheet, View } from 'react-native';
import { useTheme } from 'react-native-paper';

// The MD3 "active indicator" pattern — a pill-shaped tint behind the icon
// on the focused tab, not just a plain color swap on the icon/label. Shared
// by both the admin and employee bottom tab bars (`(admin)/_layout.tsx`,
// `(employee)/_layout.tsx`) rather than duplicated per layout.
export function AppTabBarIcon({
  name,
  focused,
  color,
  size,
}: {
  name: string;
  focused: boolean;
  color: ColorValue;
  size: number;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.pill, focused && { backgroundColor: theme.colors.primaryContainer }]}>
      <MaterialCommunityIcons name={name as never} color={color} size={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    width: 56,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
