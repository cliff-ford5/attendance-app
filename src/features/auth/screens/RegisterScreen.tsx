import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Button, HelperText, Icon, Text } from 'react-native-paper';
import { AppTextInput as TextInput } from '@/components/AppTextInput';
import { NotConfiguredState } from '@/components/ScreenState';
import { isSupabaseConfigured } from '@/services/supabase';
import { useAuth } from '../hooks/useAuth';

export function RegisterScreen() {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  if (!isSupabaseConfigured) return <NotConfiguredState />;

  if (awaitingConfirmation) {
    return (
      <View style={styles.confirmContainer}>
        <Icon source="email-check-outline" size={48} color="#1F6FEB" />
        <Text variant="headlineSmall" style={[styles.title, styles.centerText]}>
          Check your email
        </Text>
        <Text variant="bodyMedium" style={[styles.subtitle, styles.centerText]}>
          We sent a confirmation link to {email.trim()}. Tap it, then come back and sign in.
        </Text>
        <Link href="/(auth)/login" style={styles.link}>
          <Text variant="bodyMedium">Back to sign in</Text>
        </Link>
      </View>
    );
  }

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      const { needsEmailConfirmation } = await signUp({ name: name.trim(), email: email.trim(), password });
      if (needsEmailConfirmation) setAwaitingConfirmation(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create your account.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <Text variant="headlineMedium" style={styles.title}>
          Create your account
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          New accounts start as an Employee. An admin can promote your role later.
        </Text>

        <TextInput label="Full name" value={name} onChangeText={setName} style={styles.input} />
        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="emailAddress"
          style={styles.input}
        />
        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="newPassword"
          style={styles.input}
        />
        {error && <HelperText type="error">{error}</HelperText>}

        <Button mode="contained" onPress={handleSubmit} loading={submitting} disabled={submitting}>
          Create account
        </Button>

        <Link href="/(auth)/login" style={styles.link}>
          <Text variant="bodyMedium">Already have an account? Sign in</Text>
        </Link>
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
  confirmContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  centerText: {
    textAlign: 'center',
  },
  title: {
    marginBottom: 4,
  },
  subtitle: {
    marginBottom: 24,
    opacity: 0.7,
  },
  input: {
    marginBottom: 12,
  },
  link: {
    marginTop: 20,
    alignSelf: 'center',
  },
});
