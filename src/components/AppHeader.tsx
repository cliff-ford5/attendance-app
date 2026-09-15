import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Appbar, IconButton, Menu, Text, useTheme } from 'react-native-paper';
import { AppAvatar } from './AppAvatar';
import { SignOutDialog } from './SignOutDialog';
import { headerTint } from '@/constants/theme';
import { useAuth } from '@/features/auth/hooks/useAuth';

export type AppHeaderAction = {
  icon: string;
  onPress: () => void;
  accessibilityLabel: string;
};

// Replaces React Navigation's default header (styled through the separate
// navigation theme — see ARCHITECTURE.md's Theming section) with Paper's
// own Appbar, so headers are driven by the one theme every other component
// already uses. `mode="medium"` (112dp) is the tab-root variant — `"large"`
// (152dp) was tried first and flagged as possibly too spacious back when it
// shipped (see ARCHITECTURE.md's Theming section); the user independently
// landed on the same read later ("too big... a ton of whitespace"),
// confirming it — medium keeps the same big-title tab-root pattern with
// meaningfully less dead space. `mode="small"` (the default) is for screens
// reached by drilling in, which should also pass `onBack`.
export function AppHeader({
  title,
  mode = 'small',
  onBack,
  onClose,
  actions,
  accountMenu = false,
}: {
  title: string;
  mode?: 'small' | 'medium';
  onBack?: () => void;
  // A close "X" instead of a back arrow — for modal-presented screens
  // (Expo Router `presentation: 'modal'`), where "back" is the wrong
  // affordance since there's no forward stack to return through, only a
  // sheet to dismiss. Mutually exclusive with onBack in practice; if both
  // are somehow passed, onClose wins.
  onClose?: () => void;
  actions?: AppHeaderAction[];
  // Renders the signed-in user's avatar instead of a bare sign-out icon —
  // tapping it opens a menu (View profile/Sign out) rather than signing out
  // on a single accidental tap, which the plain icon it replaces used to do
  // with zero confirmation. Pulls the signed-in user via useAuth() itself
  // rather than requiring every call site to thread profile/signOut
  // through — every tab-root header wants this, so it shouldn't be
  // per-screen boilerplate.
  accountMenu?: boolean;
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
  const theme = useTheme();
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const [menuVisible, setMenuVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);

  const isAdmin = profile?.role !== 'employee';

  async function handleSignOut() {
    setConfirmVisible(false);
    await signOut();
  }

  const accountMenuNode = accountMenu && (
    <Menu
      visible={menuVisible}
      onDismiss={() => setMenuVisible(false)}
      anchor={
        <Pressable onPress={() => setMenuVisible(true)} accessibilityLabel="Account menu" hitSlop={8}>
          <AppAvatar name={profile?.name} avatarPath={profile?.avatar_path} size={32} />
        </Pressable>
      }
    >
      {profile && (
        <Menu.Item
          leadingIcon="account-outline"
          title="View profile"
          onPress={() => {
            setMenuVisible(false);
            router.push(isAdmin ? `/(admin)/staff/${profile.id}` : '/(employee)/profile');
          }}
        />
      )}
      <Menu.Item
        leadingIcon="logout"
        title="Sign out"
        onPress={() => {
          setMenuVisible(false);
          setConfirmVisible(true);
        }}
      />
    </Menu>
  );

  // Tab-root headers (mode !== 'small') are a fully custom, compact layout,
  // not Paper's Appbar "medium" mode — that mode reserves a whole second
  // row for a big title and, worse, lays out any non-Appbar.* child (like
  // the logo Image) into its top icon row rather than alongside the title,
  // which is exactly why the logo showed up squeezed next to the avatar
  // instead of centered. A plain View gives full control: the logo is
  // centered via an absolutely-positioned overlay spanning the whole row,
  // so it's centered on the row itself regardless of what's on either
  // side — not just centered between whatever happens to be there.
  if (mode !== 'small') {
    const backgroundColor = theme.dark ? headerTint.dark : headerTint.light;
    return (
      <>
        <View style={[styles.compactHeader, { backgroundColor, paddingTop: insets.top }]}>
          <View style={styles.iconRow}>
            <View style={styles.sideGroup} />
            <View style={styles.centerOverlay} pointerEvents="box-none">
              <Image source={require('@/assets/images/uc-logo-mark.png')} style={styles.logo} resizeMode="contain" />
            </View>
            <View style={[styles.sideGroup, styles.sideGroupRight]}>
              {actions?.map((action) => (
                <IconButton
                  key={action.icon}
                  icon={action.icon}
                  size={22}
                  onPress={action.onPress}
                  accessibilityLabel={action.accessibilityLabel}
                />
              ))}
              {accountMenuNode}
            </View>
          </View>
          <Text variant="titleMedium" style={styles.compactTitle}>
            {title}
          </Text>
        </View>

        <SignOutDialog visible={confirmVisible} onDismiss={() => setConfirmVisible(false)} onConfirm={handleSignOut} />
      </>
    );
  }

  return (
    <>
      <Appbar.Header mode="small" statusBarHeight={insets.top} style={[styles.header, { backgroundColor: theme.colors.background }]}>
        {onClose ? (
          <Appbar.Action icon="close" onPress={onClose} accessibilityLabel="Close" />
        ) : (
          onBack && <Appbar.BackAction onPress={onBack} />
        )}
        <Appbar.Content title={title} />
        {actions?.map((action) => (
          <Appbar.Action key={action.icon} icon={action.icon} onPress={action.onPress} accessibilityLabel={action.accessibilityLabel} />
        ))}
        {accountMenu && <View style={styles.avatarWrap}>{accountMenuNode}</View>}
      </Appbar.Header>

      <SignOutDialog visible={confirmVisible} onDismiss={() => setConfirmVisible(false)} onConfirm={handleSignOut} />
    </>
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
  avatarWrap: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  compactHeader: {
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    paddingBottom: 8,
  },
  iconRow: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  sideGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 48,
  },
  sideGroupRight: {
    marginLeft: 'auto',
    marginRight: 8,
  },
  centerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 30,
    height: 30,
  },
  compactTitle: {
    textAlign: 'center',
    marginTop: 2,
  },
});
