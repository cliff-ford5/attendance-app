import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';

// Device-level preference, not per-employee — this app assumes one person
// per physical device (same assumption self-registration already makes),
// so there's no need to scope this to whoever's currently signed in.
const STORAGE_KEY = 'biometricLockEnabled';

export async function isBiometricSupported(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return false;
  return LocalAuthentication.isEnrolledAsync();
}

export async function getBiometricPreference(): Promise<boolean> {
  const value = await AsyncStorage.getItem(STORAGE_KEY);
  return value === 'true';
}

export async function setBiometricPreference(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
}

// Purely on-device — no network call, no credentials involved. Returns
// false on cancel/failure just as readily as a real mismatch; callers
// shouldn't distinguish "wrong finger" from "user backed out", same as
// the OS's own prompt doesn't surface that distinction meaningfully.
export async function authenticate(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Unlock Attendance',
    disableDeviceFallback: false,
  });
  return result.success;
}
