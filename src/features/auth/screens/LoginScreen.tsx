import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Button, HelperText, Text } from 'react-native-paper';
import { AppTextInput as TextInput } from '@/components/AppTextInput';
import { NotConfiguredState } from '@/components/ScreenState';
import { isSupabaseConfigured } from '@/services/supabase';
import { useAuth } from '../hooks/useAuth';

export function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isSupabaseConfigured) return <NotConfiguredState />;

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await signIn({ email: email.trim(), password });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not sign in.');
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
          Attendance
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Sign in with your work email to check in and see your tasks.
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
        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="password"
          style={styles.input}
        />
        {error && <HelperText type="error">{error}</HelperText>}

        <Button mode="contained" onPress={handleSubmit} loading={submitting} disabled={submitting}>
          Sign in
        </Button>

        <Link href="/(auth)/register" style={styles.link}>
          <Text variant="bodyMedium">New here? Create an account</Text>
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

