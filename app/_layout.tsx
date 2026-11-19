import { useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { useStore } from '@/lib/store';
import { useDraft } from '@/lib/draft';
import { commitDraft } from '@/lib/commit';
import { markOpen } from '@/lib/rating';
import { ToastHost } from '@/components/ToastHost';

SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions?.({ duration: 400, fade: true });

const PUBLIC = new Set(['', 'welcome', 'auth', 'onboarding']);

export default function Root() {
  const [fonts] = useFonts({ PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold });
  const { ready, loaded, signedIn, cycle, boot, isAnonymous } = useStore();
  const planReady = useDraft((s) => s.planReady);
  const seg = useSegments(); const router = useRouter();
  const committing = useRef(false);

  useEffect(() => { boot(); markOpen(); }, []);
  useEffect(() => { if (fonts && ready) SplashScreen.hideAsync().catch(() => {}); }, [fonts, ready]);

  // Navigation gate: signed-out people browse onboarding; finishing it creates a silent (anonymous) account,
  // and a finished draft is saved the moment that account exists.
  useEffect(() => {
    if (!ready || !fonts) return;
    const top = String(seg[0] ?? '');
    if (!signedIn) { if (!PUBLIC.has(top) || top === '') router.replace('/welcome'); return; }
    if (!loaded) return;
    if (!cycle) {
      if (planReady && !committing.current) {
        committing.current = true;
        commitDraft().then((ok) => { committing.current = false; if (ok) router.replace('/onboarding/notify'); });
        return;
      }
      if (top !== 'onboarding' && !(top === 'auth' && isAnonymous)) router.replace('/onboarding/goal');
      return;
    }
    // Signed-in people may still open /auth (backing up a silent account, or switching accounts); that screen navigates itself.
    if (top === '' || top === 'welcome') router.replace('/(tabs)/today');
  }, [ready, fonts, signedIn, loaded, cycle, planReady, seg, isAnonymous]);

  if (!fonts) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, animation: 'ios_from_right', contentStyle: { backgroundColor: '#F3F5F3' }, gestureEnabled: true }}>
          <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          <Stack.Screen name="paywall" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom', gestureEnabled: false }} />
          <Stack.Screen name="onboarding/reveal" options={{ animation: 'fade', gestureEnabled: false }} />
          <Stack.Screen name="onboarding/notify" options={{ animation: 'fade', gestureEnabled: false }} />
          <Stack.Screen name="move" options={{ presentation: 'transparentModal', animation: 'none', contentStyle: { backgroundColor: 'transparent' } }} />
        </Stack>
        <ToastHost />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
