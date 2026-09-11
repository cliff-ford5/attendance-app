import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

// Re-runs `load` every time this screen gains focus — first mount, tab
// switch back, or returning from a drill-in — not just once on mount.
// React Navigation keeps tab/stack screens mounted between switches rather
// than remounting them, so a plain `useEffect(() => { load() }, [load])`
// never sees data that changed while the user was elsewhere (another admin
// approved a request, a background geofence auto-checkout fired while a
// different tab was open, etc.). Shared by every data-loading hook in the
// app (see `RULES.md`'s dedup convention) rather than repeating this in
// each one.
export function useRefetchOnFocus(load: () => void) {
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );
}
