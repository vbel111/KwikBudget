import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, G, LinearGradient, Stop } from 'react-native-svg';
import { Odometer } from './Odometer';
import { F } from '@/lib/theme';

const AC = Animated.createAnimatedComponent(Circle);

/**
 * The allowance gauge.
 * - The arc springs to its value with weight (mass) so it settles like a physical dial.
 * - A glowing knob rides the arc end; a soft halo pulses behind it.
 * - 60 tick marks give it an instrument feel; ticks already "spent" dim out.
 * - When over the limit the arc turns coral and the whole dial does a small shake.
 */
export function Ring({ left, total, size = 220, sub }: { left: number; total: number; size?: number; sub: string }) {
  const c = size / 2, r = size * 0.39, sw = size * 0.085, circ = 2 * Math.PI * r;
  const frac = total <= 0 ? 0 : Math.max(0, Math.min(1, left / total));
  const over = left < 0;
  const p = useSharedValue(0); const halo = useSharedValue(0); const shake = useSharedValue(0);

  useEffect(() => { p.value = withDelay(250, withSpring(frac, { damping: 15, stiffness: 50, mass: 1.4 })); }, [frac]);
  useEffect(() => {
    if (over) shake.value = withSequence(withTiming(-6, { duration: 50 }), withRepeat(withTiming(6, { duration: 70 }), 4, true), withTiming(0, { duration: 50 }));
  }, [over]);
  useEffect(() => { halo.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }), -1, true); }, []);

  const arc = useAnimatedProps(() => ({ strokeDashoffset: circ * (1 - p.value) }));
  const glow = useAnimatedProps(() => ({ strokeDashoffset: circ * (1 - p.value), strokeOpacity: 0.18 + halo.value * 0.12 }));
  const knob = useAnimatedProps(() => {
    const a = -Math.PI / 2 + p.value * Math.PI * 2;
    return { cx: c + r * Math.cos(a), cy: c + r * Math.sin(a), opacity: p.value > 0.01 ? 1 : 0 };
  });
  const knobHalo = useAnimatedProps(() => {
    const a = -Math.PI / 2 + p.value * Math.PI * 2;
    return { cx: c + r * Math.cos(a), cy: c + r * Math.sin(a), r: sw * (0.75 + halo.value * 0.35), opacity: p.value > 0.01 ? 0.35 - halo.value * 0.2 : 0 };
  });
  const wrap = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  const ticks = Array.from({ length: 60 }, (_, i) => i);
  return (
    <Animated.View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, wrap]}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#E6FFC9" /><Stop offset="0.5" stopColor="#4EE05A" /><Stop offset="1" stopColor="#14A432" /></LinearGradient>
        </Defs>
        <G>
          {ticks.map((i) => {
            const a = (i / 60) * Math.PI * 2 - Math.PI / 2; const r1 = r + sw * 0.95, r2 = r1 + (i % 5 === 0 ? 7 : 4);
            return <Circle key={i} cx={c + ((r1 + r2) / 2) * Math.cos(a)} cy={c + ((r1 + r2) / 2) * Math.sin(a)} r={i % 5 === 0 ? 1.4 : 0.9} fill={i / 60 < frac ? '#9BE878' : '#2B362C'} />;
          })}
        </G>
        <Circle cx={c} cy={c} r={r} stroke="#18221A" strokeWidth={sw} fill="none" />
        <AC cx={c} cy={c} r={r} strokeWidth={sw * 2.2} strokeLinecap="round" fill="none" strokeDasharray={`${circ} ${circ}`} animatedProps={glow} stroke="#3DDC4A" rotation={-90} originX={c} originY={c} />
        <AC cx={c} cy={c} r={r} strokeWidth={sw} strokeLinecap="round" fill="none" strokeDasharray={`${circ} ${circ}`} animatedProps={arc} stroke={over ? '#FF7A6B' : 'url(#rg)'} rotation={-90} originX={c} originY={c} />
        <AC animatedProps={knobHalo} fill="#C4F89B" />
        <AC animatedProps={knob} r={sw * 0.42} fill="#fff" />
      </Svg>
      <View style={{ alignItems: 'center' }}>
        <Odometer value={left} size={size * 0.17} color="#fff" centsColor="#9AA29A" />
        <Text style={{ fontFamily: F.s, fontSize: 13, color: '#C3CAC3', marginTop: 2 }}>left today</Text>
        <Text style={{ fontFamily: F.r, fontSize: 11, color: '#7F877F', marginTop: 1 }}>{sub}</Text>
      </View>
    </Animated.View>
  );
}
