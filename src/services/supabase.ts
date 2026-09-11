import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// True until real credentials are dropped into .env — every feature service
// checks this and surfaces a "not configured" state instead of letting a
// network call fail with a confusing error.
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// expo-router's web output does an initial static/SSR render in Node,
// where `window` doesn't exist yet — AsyncStorage's web shim touches it
// immediately, which crashes that render. No-op there; the browser takes
// over and rehydrates normally on the client pass.
const storage =
  typeof window === 'undefined'
    ? { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} }
    : AsyncStorage;

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
