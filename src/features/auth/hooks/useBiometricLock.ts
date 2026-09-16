import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import * as biometricService from '../services/biometricService';

// Below this, returning from the background doesn't re-lock — a quick
// glance at a notification or another app shouldn't force a fresh
// fingerprint prompt every single time. Above it, treat it like a fresh
// cold start. 30s is a reasonable default for this app's stakes (not a
// banking app); revisit if it ever feels too loose or too strict in
// practice.
const BACKGROUND_GRACE_MS = 30_000;

// Backs both the MyProfileScreen toggle (enabled/setEnabled/supported) and
// BiometricGate (locked/unlock) — one hook, two consumers, since they're
// really the same piece of state (a device-level preference) viewed from
// two different screens.
export function useBiometricLock() {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabledState] = useState(false);
  const [loadingPreference, setLoadingPreference] = useState(true);
  // Starts true (locked) so there's never a frame where protected content
  // is visible before the preference has actually been checked — flips to
  // false immediately below once loaded, if locking isn't actually enabled.
  const [locked, setLocked] = useState(true);
  const [authenticating, setAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [isSupported, isEnabled] = await Promise.all([
        biometricService.isBiometricSupported(),
        biometricService.getBiometricPreference(),
      ]);
      setSupported(isSupported);
      setEnabledState(isEnabled);
      setLocked(isEnabled && isSupported);
      setLoadingPreference(false);
    })();
  }, []);

  // Re-locks after a real amount of time in the background — the gap the
  // cold-start-only check originally left: backgrounding the app (switching
  // away, locking the phone screen) without fully closing it never
  // re-triggered the lock at all before this.
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const backgroundedAtRef = useRef<number | null>(null);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const wasActive = appStateRef.current === 'active';
      const isNowActive = nextState === 'active';

      if (wasActive && !isNowActive) {
        backgroundedAtRef.current = Date.now();
      } else if (!wasActive && isNowActive) {
        const backgroundedAt = backgroundedAtRef.current;
        backgroundedAtRef.current = null;
        if (enabled && backgroundedAt !== null && Date.now() - backgroundedAt > BACKGROUND_GRACE_MS) {
          setLocked(true);
        }
      }
      appStateRef.current = nextState;
    });
    return () => subscription.remove();
  }, [enabled]);

  async function setEnabled(next: boolean) {
    if (next) {
      // Verify biometrics actually work on this device before committing
      // to the preference — turning this on shouldn't be able to lock
      // someone out on their very next app open if, say, they cancel the
      // very first prompt or the sensor genuinely doesn't work.
      const ok = await biometricService.authenticate();
      if (!ok) return false;
    }
    await biometricService.setBiometricPreference(next);
    setEnabledState(next);
    return true;
  }

  const unlock = useCallback(async () => {
    setAuthenticating(true);
    setError(null);
    try {
      const ok = await biometricService.authenticate();
      if (ok) setLocked(false);
      else setError('Could not verify — try again.');
    } finally {
      setAuthenticating(false);
    }
  }, []);

  return { supported, enabled, setEnabled, loadingPreference, locked, authenticating, error, unlock };
}
