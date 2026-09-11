import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Text } from 'react-native-paper';

// Shared loading/error/empty rendering — every data-fetching screen
// (attendance, tasks, admin views) needs this, so it lives in the global
// components/ folder per ARCHITECTURE.md's "3+ features" rule.

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" />
      <Text style={styles.message}>{label}</Text>
    </View>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.center}>
      <Text variant="titleMedium" style={styles.message}>
        Something went wrong
      </Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <Button mode="contained-tonal" onPress={onRetry} style={styles.button}>
          Try again
        </Button>
      )}
    </View>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.center}>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

// Shown on any data-fetching screen while EXPO_PUBLIC_SUPABASE_URL/ANON_KEY
// are still placeholders — see services/supabase.ts's isSupabaseConfigured.
export function NotConfiguredState() {
  return (
    <View style={styles.center}>
      <Text variant="titleMedium" style={styles.message}>
        Supabase isn't configured yet
      </Text>
      <Text style={styles.message}>
        Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env, then restart the app.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  message: {
    textAlign: 'center',
  },
  button: {
    marginTop: 8,
  },
});
