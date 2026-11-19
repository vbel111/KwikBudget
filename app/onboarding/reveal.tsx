import { useEffect, useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn, FadeInDown, FadeInUp, ZoomIn, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming, Easing,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient as LG, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Cta } from '@/components/ui';
import { Odometer } from '@/components/Odometer';
import { Burst } from '@/components/Burst';
import { Icon, IconName } from '@/components/Icon';
import { billsTotal, useDraft } from '@/lib/draft';
import { useStore } from '@/lib/store';
import { commitDraft } from '@/lib/commit';
import { moneyShort, round2 } from '@/lib/money';
import { C, F } from '@/lib/theme';
import { success, thud } from '@/lib/fx';

const AC = Animated.createAnimatedComponent(Circle);

function CheckLine({ icon, text, sub }: { icon: IconName; text: string; sub: string }) {
  return (
    <Animated.View entering={FadeInDown.springify().damping(15)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
      <Animated.View entering={ZoomIn.delay(120).springify().damping(9)} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="check" size={18} sw={3} />
      </Animated.View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: F.b, fontSize: 15, color: '#fff' }}>{text}</Text>
        <Text style={{ fontFamily: F.r, fontSize: 12, color: '#9AA29A', marginTop: 1 }}>{sub}</Text>
      </View>
      <Icon name={icon} size={18} color="#4A524A" />
    </Animated.View>
  );
}

/**
 * The reward moment of onboarding. A short build-up (three steps tick in with haptics) makes the result feel earned,
 * then the dial sweeps, digits roll to the daily number and confetti fires.
 */
export default function Reveal() {
  const r = useRouter(); const ins = useSafeAreaInsets(); const { width } = useWindowDimensions();
  const d = useDraft(); const { signedIn, cycle, startAnonymous } = useStore();
  const [phase, setPhase] = useState(0); const [busy, setBusy] = useState(false);
  const s = d.split!;
  const spendable = s ? round2(s.food + s.transport + s.fun + s.buffer) : 0;
  const daily = spendable / Math.max(1, d.paydayOffset);
  const size = Math.min(width - 80, 250); const c = size / 2, R = size * 0.4, circ = 2 * Math.PI * R;
  const p = useSharedValue(0); const glow = useSharedValue(0);

  useEffect(() => {
    const t = [700, 1350, 2000, 2700].map((ms, i) => setTimeout(() => { setPhase(i + 1); i < 3 ? thud() : success(); }, ms));
    return () => t.forEach(clearTimeout);
  }, []);
  useEffect(() => {
    if (phase === 4) {
      p.value = withSpring(1, { damping: 16, stiffness: 40, mass: 1.2 });
      glow.value = withSequence(withTiming(1, { duration: 500 }), withDelay(300, withTiming(0.4, { duration: 1200, easing: Easing.out(Easing.quad) })));
    }
  }, [phase]);
  const arc = useAnimatedProps(() => ({ strokeDashoffset: circ * (1 - p.value) }));
  const halo = useAnimatedStyle(() => ({ opacity: glow.value, transform: [{ scale: 0.8 + glow.value * 0.3 }] }));

  const save = async () => {
    d.setPlanReady(true);
    // No sign-up wall: create a silent account. The root gate then saves the plan and moves on.
    if (!signedIn) { setBusy(true); const ok = await startAnonymous(); if (!ok) setBusy(false); return; }
    if (cycle) { setBusy(true); const ok = await commitDraft(); setBusy(false); if (ok) r.replace('/(tabs)/today'); }
    // Signed in without a cycle: the root gate saves the plan and moves on.
  };

  return (
    <LinearGradient colors={['#1C4A26', '#0C120D', '#050705']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.8 }} style={{ flex: 1, paddingTop: ins.top + 24, paddingHorizontal: 24 }}>
      <StatusBar style="light" />
      <Animated.Text entering={FadeIn.duration(500)} style={{ fontFamily: F.s, fontSize: 13, color: C.lime, letterSpacing: 0.4 }}>
        {phase < 4 ? 'BUILDING YOUR PLAN' : 'YOUR PLAN IS READY'}
      </Animated.Text>
      <Animated.Text entering={FadeInDown.delay(100).springify()} style={{ fontFamily: F.x, fontSize: 30, letterSpacing: -0.8, color: '#fff', marginTop: 6 }}>
        {phase < 4 ? 'Putting every dollar in its place…' : 'You can spend this much, every day'}
      </Animated.Text>

      <View style={{ height: size + 20, alignItems: 'center', justifyContent: 'center', marginTop: 18 }}>
        <Animated.View style={[{ position: 'absolute', width: size * 1.1, height: size * 1.1, borderRadius: size, backgroundColor: 'rgba(61,220,74,.18)' }, halo]} />
        <Svg width={size} height={size} style={{ position: 'absolute' }}>
          <Defs><LG id="rv" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#E6FFC9" /><Stop offset="0.5" stopColor="#4EE05A" /><Stop offset="1" stopColor="#14A432" /></LG></Defs>
          <Circle cx={c} cy={c} r={R} stroke="#18221A" strokeWidth={size * 0.08} fill="none" />
          <AC cx={c} cy={c} r={R} stroke="url(#rv)" strokeWidth={size * 0.08} strokeLinecap="round" fill="none" strokeDasharray={`${circ} ${circ}`} animatedProps={arc} rotation={-90} originX={c} originY={c} />
        </Svg>
        {phase >= 4 ? (
          <Animated.View entering={ZoomIn.springify().damping(12)} style={{ alignItems: 'center' }}>
            <Odometer value={daily} size={size * 0.17} color="#fff" centsColor="#9AA29A" />
            <Text style={{ fontFamily: F.s, fontSize: 13, color: '#C3CAC3' }}>per day until payday</Text>
          </Animated.View>
        ) : <Animated.Text entering={FadeIn} style={{ fontFamily: F.x, fontSize: 40, color: '#2B362C' }}>…</Animated.Text>}
      </View>

      <View style={{ marginTop: 8 }}>
        {phase >= 1 && <CheckLine icon="shield" text={`${moneyShort(billsTotal(d.bills, d.paydayOffset))} locked for bills`} sub="Rent and bills can't be spent by accident" />}
        {phase >= 2 && <CheckLine icon="jar" text={`${moneyShort(s?.savings ?? 0)} saved automatically`} sub="Out of sight before you start spending" />}
        {phase >= 3 && <CheckLine icon="coin" text={`${moneyShort(spendable)} ready to spend`} sub={`Spread over ${d.paydayOffset} days, rolls over when you spend less`} />}
      </View>

      {phase >= 4 && (
        <Animated.View entering={FadeInUp.delay(400).springify()} style={{ position: 'absolute', left: 24, right: 24, bottom: ins.bottom + 20 }}>
          <Cta title="Start my plan" icon="arrow" shine loading={busy} onPress={save} />
          <Text style={{ fontFamily: F.r, fontSize: 12, color: '#7F877F', textAlign: 'center', marginTop: 10 }}>No sign-up needed. You can change any number later.</Text>
        </Animated.View>
      )}
      {phase >= 4 && <Burst origin="top" />}
    </LinearGradient>
  );
}
