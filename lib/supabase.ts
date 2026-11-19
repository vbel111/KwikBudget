import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
// Supabase's new publishable key (sb_publishable_...). The legacy anon key name still works as a fallback.
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(url ?? 'http://localhost', key ?? 'missing', {
  auth: {
    // AsyncStorage, as Supabase recommends for React Native (SecureStore caps values at ~2KB, sessions can be larger).
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
export const supabaseConfigured = !!url && !!key;
if (__DEV__) console.log(`[Kwik Budget] Supabase ${supabaseConfigured ? `→ ${url}` : 'NOT configured: EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_KEY are missing'}`);

// Only refresh the session while the app is in the foreground (Supabase's React Native guidance).
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
