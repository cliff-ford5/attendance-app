import { Button, Dialog, Portal, Text } from 'react-native-paper';

// A single confirmation step before signing out — shared by AppHeader's
// account menu and CheckInScreen's own header (the one screen with a
// hand-built header instead of AppHeader). Both used to fire signOut()
// directly on a single tap with no confirmation at all; one misplaced tap
// on either meant a forced re-login.
export function SignOutDialog({ visible, onDismiss, onConfirm }: { visible: boolean; onDismiss: () => void; onConfirm: () => void }) {
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>Sign out?</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium">You'll need to sign in again to continue.</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancel</Button>
          <Button onPress={onConfirm}>Sign out</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
