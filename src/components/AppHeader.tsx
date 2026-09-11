import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Appbar } from 'react-native-paper';

export type AppHeaderAction = {
  icon: string;
  onPress: () => void;
  accessibilityLabel: string;
};

// Replaces React Navigation's default header (styled through the separate
// navigation theme — see ARCHITECTURE.md's Theming section) with Paper's
// own Appbar, so headers are driven by the one theme every other component
// already uses. `mode="large"` is MD3's real pattern for top-level tab
// destinations; `mode="small"` (the default) is for screens reached by
// drilling in, which should also pass `onBack`.
export function AppHeader({
  title,
  mode = 'small',
  onBack,
  actions,
}: {
  title: string;
  mode?: 'small' | 'large';
  onBack?: () => void;
  actions?: AppHeaderAction[];
}) {
  // A custom React Navigation `header` render prop (used here instead of
  // the default header) isn't wrapped in a SafeAreaView the way the
  // built-in header is — so it's on us to inset for the status bar.
  // Paper's own `statusBarHeight` default instead assumes an edge-to-edge
  // translucent status bar and adds its own guessed padding, which either
  // doubled up (gap too big) or, at 0, let the header sit under the status
  // bar entirely (icons overlapping) — both found by actually looking at
  // it running. The real device inset is the only value that's correct.
  const insets = useSafeAreaInsets();

  return (
    <Appbar.Header mode={mode} statusBarHeight={insets.top} style={styles.header}>
      {onBack && <Appbar.BackAction onPress={onBack} />}
      <Appbar.Content title={title} />
      {actions?.map((action) => (
        <Appbar.Action key={action.icon} icon={action.icon} onPress={action.onPress} accessibilityLabel={action.accessibilityLabel} />
      ))}
    </Appbar.Header>
  );
}

// A soft shadow instead of a hard bottom border — same "shadow over
// outline" call this app's Cards already make (see ARCHITECTURE.md's
// Theming section) — rather than leaving the header perfectly flush with
// scrolling content beneath it.
const styles = StyleSheet.create({
  header: {
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
});
