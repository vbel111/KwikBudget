import { useEffect, useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Animated, {
  Easing, FadeIn, FadeInDown, FadeInUp, FadeOut, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSpring, withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient as LG, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { C, F } from '@/lib/theme';
import { Cta, Ghost } from '@/components/ui';
import { Odometer } from '@/components/Odometer';
import { Icon, IconName } from '@/components/Icon';
import { Floaty } from '@/components/Illustrations';
import { LogoMark } from '@/components/LogoMark';

const AC = Animated.createAnimatedComponent(Circle);

/** The three promises rotate under the dial so the welcome screen tells the story without a carousel. */
const STORY: { icon: IconName; label: string; value: string }[] = [
  { icon: 'lock', label: 'Rent', value: '$800 reserved' },
  { icon: 'jar', label: 'You typed', value: 'lunch 8 → Food' },
  { icon: 'flame', label: 'Streak', value: '5 days on pace' },
];

const Glass = ({ icon, label, value }: { icon: IconName; label: string; value: string }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,.1)', borderColor: 'rgba(255,255,255,.2)', borderWidth: 1, borderRadius: 18, paddingVertical: 9, paddingLeft: 9, paddingRight: 14 }}>
    <View style={{ width: 32, height: 32, borderRadius: 11, backgroundColor: '#141A15', alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={16} color={C.green} /></View>
    <View><Text style={{ fontFamily: F.r, fontSize: 11, color: '#D6DCD6' }}>{label}</Text><Text style={{ fontFamily: F.x, fontSize: 14, color: '#fff' }}>{value}</Text></View>
  </View>
);

export default function Welcome() {
  const router = useRouter(); const ins = useSafeAreaInsets(); const { width } = useWindowDimensions();
  const size = Math.min(width - 40, 300); const c = size / 2; const R = size * 0.34; const circ = 2 * Math.PI * R;
  const p = useSharedValue(0); const spin = useSharedValue(0);
  const [amount, setAmount] = useState(0); const [story, setStory] = useState(0);

  useEffect(() => {
    p.value = withDelay(400, withSpring(0.72, { damping: 15, stiffness: 38, mass: 1.3 }));
    spin.value = withRepeat(withTiming(1, { duration: 24000, easing: Easing.linear }), -1);
    const a = setTimeout(() => setAmount(38.4), 500);
    const s = setInterval(() => setStory((x) => (x + 1) % STORY.length), 2600);
    return () => { clearTimeout(a); clearInterval(s); };
  }, []);
  const arc = useAnimatedProps(() => ({ strokeDashoffset: circ * (1 - p.value) }));
  const orbit = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));

  return (
    <LinearGradient colors={['#245F30', '#0C150E', '#050705']} start={{ x: 0.5, y: 0.1 }} end={{ x: 0.5, y: 0.75 }} style={{ flex: 1, paddingTop: ins.top + 12 }}>
      <StatusBar style="light" />
      <Animated.View entering={FadeInDown.springify()} style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 24 }}>
        <LogoMark size={34} />
        <Text style={{ fontFamily: F.x, fontSize: 18, color: '#fff' }}>Kwik Budget</Text>
      </Animated.View>

      <View style={{ height: size + 40, marginTop: 16, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={[{ position: 'absolute', width: size, height: size }, orbit]}>
          <Svg width={size} height={size}>
            <Circle cx={c} cy={c} r={c - 4} stroke="#fff" strokeOpacity={0.07} strokeWidth={1.5} strokeDasharray="2 10" fill="none" />
            <Circle cx={c} cy={4} r={4} fill={C.gold} />
          </Svg>
        </Animated.View>
        <Svg width={size} height={size} style={{ position: 'absolute' }}>
          <Defs><LG id="w" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#E6FFC9" /><Stop offset="0.5" stopColor="#4EE05A" /><Stop offset="1" stopColor="#14A432" /></LG></Defs>
          <Circle cx={c} cy={c} r={c * 0.84} stroke="#fff" strokeOpacity={0.06} strokeWidth={2} fill="none" />
          <Circle cx={c} cy={c} r={R} stroke="#18221A" strokeWidth={size * 0.075} fill="none" />
          <AC cx={c} cy={c} r={R} stroke="#3DDC4A" strokeOpacity={0.2} strokeWidth={size * 0.15} strokeLinecap="round" fill="none" strokeDasharray={`${circ} ${circ}`} animatedProps={arc} rotation={-90} originX={c} originY={c} />
          <AC cx={c} cy={c} r={R} stroke="url(#w)" strokeWidth={size * 0.075} strokeLinecap="round" fill="none" strokeDasharray={`${circ} ${circ}`} animatedProps={arc} rotation={-90} originX={c} originY={c} />
          <Circle cx={c} cy={c} r={R - size * 0.06} fill="#0B110C" />
        </Svg>
        <Animated.View entering={FadeIn.delay(500)} style={{ alignItems: 'center' }}>
          <Odometer value={amount} size={size * 0.15} color="#fff" centsColor="#9AA29A" />
          <Text style={{ fontFamily: F.s, fontSize: 13, color: '#C3CAC3', marginTop: 2 }}>safe to spend today</Text>
        </Animated.View>
        <Floaty style={{ position: 'absolute', bottom: 0 }} amp={5}>
          <Animated.View key={story} entering={FadeInUp.springify().damping(14)} exiting={FadeOut.duration(150)}>
            <Glass {...STORY[story]} />
          </Animated.View>
        </Floaty>
      </View>

      <Animated.View entering={FadeInDown.delay(200).springify()} style={{ paddingHorizontal: 24, marginTop: 22 }}>
        <Text style={{ fontFamily: F.x, fontSize: 36, lineHeight: 40, letterSpacing: -1, color: '#fff' }}>One number.{'\n'}Every day.</Text>
        <Text style={{ fontFamily: F.r, fontSize: 16, lineHeight: 24, color: '#C3CAC3', marginTop: 12 }}>
          Kwik Budget protects your bills, fills your jars and tells you exactly what is safe to spend until payday.
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(700).springify()} style={{ position: 'absolute', left: 24, right: 24, bottom: ins.bottom + 16, gap: 4 }}>
        <Cta title="Build my plan" icon="arrow" shine onPress={() => router.push('/onboarding/goal')} />
        <Ghost title="I already have an account" color="#fff" onPress={() => router.push({ pathname: '/auth', params: { mode: 'in' } })} />
      </Animated.View>
    </LinearGradient>
  );
}
