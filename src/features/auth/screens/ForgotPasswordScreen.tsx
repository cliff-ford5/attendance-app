import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Button, HelperText, Text } from 'react-native-paper';
import { AppHeader } from '@/components/AppHeader';
import { AppTextInput as TextInput } from '@/components/AppTextInput';
import { NotConfiguredState } from '@/components/ScreenState';
import { isSupabaseConfigured } from '@/services/supabase';
import { useForgotPassword } from '../hooks/useForgotPassword';

export function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const { sending, error, sent, sendResetEmail } = useForgotPassword();

  if (!isSupabaseConfigured) return <NotConfiguredState />;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ header: () => <AppHeader title="Reset password" onBack={() => router.back()} /> }} />
      <View style={styles.container}>
        {sent ? (
          <>
            <Text variant="titleMedium" style={styles.title}>
              Check your email
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              If an account exists for {email.trim()}, a password reset link was sent. Open it on your phone or
              computer to set a new password, then come back here to sign in.
            </Text>
            <Button mode="contained" onPress={() => router.back()}>
              Back to sign in
            </Button>
          </>
        ) : (
          <>
            <Text variant="titleMedium" style={styles.title}>
              Forgot your password?
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Enter your work email and we'll send you a link to set a new one.
            </Text>
            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
              style={styles.input}
            />
            {error && <HelperText type="error">{error}</HelperText>}
            <Button
              mode="contained"
              onPress={() => sendResetEmail(email.trim())}
              loading={sending}
              disabled={sending || email.trim().length === 0}
            >
              Send reset link
            </Button>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 4,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 24,
    opacity: 0.7,
  },
  input: {
    marginBottom: 12,
  },
});
