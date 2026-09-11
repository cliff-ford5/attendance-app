import { useState } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Avatar, useTheme } from 'react-native-paper';
import { getAvatarPublicUrl } from '@/lib/avatarUrl';

function initials(name?: string) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// Used everywhere an employee's identity is shown (Staff roster, Staff
// Attendance rows, Staff Profile, the employee's own Check-In greeting) —
// falls back to initials on a null path, a failed image load, or a stale
// path pointing at a deleted file, so a broken avatar never blocks
// recognizing who the row is about.
export function AppAvatar({
  name,
  avatarPath,
  size = 40,
  style,
}: {
  name?: string;
  avatarPath?: string | null;
  size?: number;
  // Forwarded to the underlying Avatar — needed when this is used as a
  // List.Item's `left` render prop, which passes a `style` carrying the
  // standard left gutter (List.Item's own container has no left padding of
  // its own; List.Icon applies this automatically, a plain custom
  // component like this one has to apply it explicitly or the avatar
  // renders flush against the edge with no inset at all).
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const [failed, setFailed] = useState(false);

  if (avatarPath && !failed) {
    return <Avatar.Image size={size} source={{ uri: getAvatarPublicUrl(avatarPath) }} onError={() => setFailed(true)} style={style} />;
  }
  return (
    <Avatar.Text size={size} label={initials(name)} style={[{ backgroundColor: theme.colors.secondaryContainer }, style]} />
  );
}
