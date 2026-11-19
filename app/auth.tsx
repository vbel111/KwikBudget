import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeInDown, LinearTransition, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { Screen } from '@/components/Screen';
import { Cta, Ghost, IconBtn, Press } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { IlloVault, Floaty } from '@/components/Illustrations';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { useStore } from '@/lib/store';
import { C, F, TYPE } from '@/lib/theme';
import { success, warn } from '@/lib/fx';

/**
 * Two jobs, no sign-up wall:
 * - mode=backup: turn the silent account into a real one (adds email + password, keeps every entry).
 * - mode=in: sign in to an existing account (returning users, or a second phone).
 */
export default function Auth() {
  const { mode: m } = useLocalSearchParams<{ mode?: string }>();
  const router = useRouter();
  const { isAnonymous, cycle, backUp, showToast } = useStore();
  const [mode, setMode] = useState<'in' | 'backup'>(m === 'backup' && isAnonymous ? 'backup' : 'in');
  const [email, setEmail] = useState(''); const [pw, setPw] = useState(''); const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState<{ text: string; ok?: boolean } | null>(null);
  const shake = useSharedValue(0);
  const sh = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  const fail = (t: string) => { setMsg({ text: t }); warn(); shake.value = withSequence(withTiming(-10, { duration: 50 }), withTiming(10, { duration: 60 }), withTiming(-6, { duration: 60 }), withTiming(0, { duration: 50 })); };
  const leave = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/today'));

  const go = async () => {
    if (!supabaseConfigured) return fail('Add your Supabase URL and key to .env.local, then restart Expo.');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return fail('That email does not look right.');
    if (mode === 'backup' && pw.length < 8) return fail('Use at least 8 characters for your password.');
    if (!pw) return fail('Enter your password.');
    setBusy(true); setMsg(null);
    if (mode === 'backup') {
      const res = await backUp(email.trim(), pw);
      setBusy(false);
      if (res === 'confirm') { setMsg({ text: `We sent a link to ${email.trim()}. Tap it, then come back and press Back up again to set your password.`, ok: true }); return; }
      if (res === 'done') { success(); showToast('Your data is backed up'); leave(); }
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw });
    setBusy(false);
    if (error) return fail(error.message.replace('Invalid login credentials', 'Email or password is incorrect.'));
    success(); router.replace('/(tabs)/today');
  };

  const reset = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return fail('Enter your email first, then tap reset.');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: 'kwikbudget://' });
    if (error) return fail(error.message);
    setMsg({ text: 'Password reset link sent. Check your inbox.', ok: true });
  };

  const field = { height: 58, borderRadius: 22, backgroundColor: '#fff', paddingHorizontal: 18, fontFamily: F.b, fontSize: 16, color: C.ink, flex: 1 } as const;
  const backup = mode === 'backup';
  return (
    <Screen bottom={40}>
      <IconBtn name="back" label="Back" onPress={leave} size={44} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Floaty style={{ alignItems: 'center', marginTop: 4 }}><IlloVault size={150} /></Floaty>
        <Animated.Text entering={FadeInDown.springify()} style={[TYPE.h1, { marginTop: 4 }]}>{backup ? 'Back up your data' : 'Welcome back'}</Animated.Text>
        <Animated.Text entering={FadeInDown.delay(60).springify()} style={[TYPE.body, { color: C.muted, marginTop: 6 }]}>
          {backup ? 'Add an email so your plan and history are safe if you lose or change your phone. Everything you have logged stays.' : 'Sign in to pick up your plan on this phone.'}
        </Animated.Text>

        {!backup && isAnonymous && cycle && (
          <Animated.View entering={FadeInDown.springify()} style={{ flexDirection: 'row', gap: 10, marginTop: 14, padding: 12, borderRadius: 16, backgroundColor: C.warn }}>
            <Icon name="warn" size={16} color={C.warnInk} />
            <Text style={{ flex: 1, fontFamily: F.s, fontSize: 13, lineHeight: 18, color: C.warnInk }}>
              This phone's current plan isn't backed up. Signing in to another account replaces it. Back it up first if you want to keep it.
            </Text>
          </Animated.View>
        )}

        <Animated.View style={[{ gap: 10, marginTop: 20 }, sh]}>
          <Animated.View entering={FadeInDown.delay(100).springify()}>
            <TextInput style={field} placeholder="Email" placeholderTextColor={C.faint} autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="emailAddress" value={email} onChangeText={setEmail} returnKeyType="next" />
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(160).springify()} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 22, paddingRight: 8 }}>
            <TextInput style={field} placeholder={backup ? 'Create a password' : 'Password'} placeholderTextColor={C.faint} secureTextEntry={!show}
              autoComplete={backup ? 'new-password' : 'current-password'} textContentType={backup ? 'newPassword' : 'password'} value={pw} onChangeText={setPw} onSubmitEditing={go} returnKeyType="go" />
            <Press onPress={() => setShow(!show)} label={show ? 'Hide password' : 'Show password'} style={{ padding: 8 }}>
              <Text style={{ fontFamily: F.b, fontSize: 13, color: C.deepGreen }}>{show ? 'Hide' : 'Show'}</Text>
            </Press>
          </Animated.View>
          {msg && (
            <Animated.View entering={FadeInDown.springify()} layout={LinearTransition} style={{ flexDirection: 'row', gap: 8, padding: 12, borderRadius: 16, backgroundColor: msg.ok ? C.softGreen : C.softDanger }}>
              <Icon name={msg.ok ? 'mail' : 'warn'} size={16} color={msg.ok ? C.deepGreen : C.danger} />
              <Text style={{ flex: 1, fontFamily: F.s, fontSize: 13, lineHeight: 18, color: msg.ok ? C.deepGreen : C.danger }}>{msg.text}</Text>
            </Animated.View>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(220).springify()} style={{ marginTop: 18 }}>
          <Cta title={backup ? 'Back up my data' : 'Sign in'} icon={backup ? 'shield' : undefined} loading={busy} onPress={go} />
          {isAnonymous && (
            <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
              <Ghost title={backup ? 'I already have an account' : 'Back up this phone instead'} onPress={() => { setMode(backup ? 'in' : 'backup'); setMsg(null); }} />
            </View>
          )}
          {!backup && <Ghost title="Forgot password?" color={C.muted} onPress={reset} />}
          <Text style={{ fontFamily: F.r, fontSize: 11, color: C.faint, textAlign: 'center', marginTop: 6, lineHeight: 16 }}>
            By continuing you agree to the Terms and Privacy Policy. Kwik Budget never connects to your bank.
          </Text>
        </Animated.View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
