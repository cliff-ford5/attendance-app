import { useCallback, useEffect, useState } from 'react';
import * as biometricService from '../services/biometricService';

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
