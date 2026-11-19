import { useEffect } from 'react';
import Animated, { Easing, useAnimatedProps, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { ClipPath, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { JAR_COLORS } from '@/lib/theme';

const AP = Animated.createAnimatedComponent(Path);
const BODY = 'M12 12h32v6c4 2 6 5 6 9v28a8 8 0 0 1-8 8H14a8 8 0 0 1-8-8V27c0-4 2-7 6-9z';

/**
 * Glass jar with liquid.
 * - Level springs to the new value; every change also "sloshes" (wave amplitude kicks up, then settles).
 * - Two waves at different speeds and phases give the liquid depth.
 */
export function Jar({ id, fill, k, width = 56 }: { id: string; fill: number; k: string; width?: number }) {
  const col = JAR_COLORS[k] ?? JAR_COLORS.food;
  const level = useSharedValue(0); const phase = useSharedValue(0); const amp = useSharedValue(1.6);
  const f = Math.max(0, Math.min(1, fill));
  useEffect(() => {
    level.value = withDelay(250, withSpring(f, { damping: 13, stiffness: 55 }));
    amp.value = withSequence(withTiming(4.2, { duration: 220 }), withTiming(1.6, { duration: 1400, easing: Easing.out(Easing.quad) }));
  }, [f]);
  useEffect(() => { phase.value = withRepeat(withTiming(Math.PI * 2, { duration: 2800, easing: Easing.linear }), -1); }, []);

  const back = useAnimatedProps(() => {
    const top = 64 - (64 - 18) * level.value - 1.2;
    const a = level.value > 0.02 ? amp.value : 0;
    let d = `M0 72 L0 ${top}`;
    for (let x = 0; x <= 56; x += 4) d += ` L${x} ${top + a * Math.sin((x / 56) * 4 * Math.PI - phase.value + 1.6)}`;
    return { d: d + ' L56 72 Z' };
  });
  const front = useAnimatedProps(() => {
    const top = 64 - (64 - 18) * level.value;
    const a = level.value > 0.02 ? amp.value : 0;
    let d = `M0 72 L0 ${top}`;
    for (let x = 0; x <= 56; x += 4) d += ` L${x} ${top + a * Math.sin((x / 56) * 4 * Math.PI + phase.value)}`;
    return { d: d + ' L56 72 Z' };
  });

  return (
    <Svg width={width} height={width * 1.25} viewBox="0 0 56 70">
      <Defs>
        <ClipPath id={id + 'c'}><Path d={BODY} /></ClipPath>
        <LinearGradient id={id + 'l'} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={col[0]} /><Stop offset="1" stopColor={col[1]} /></LinearGradient>
        <LinearGradient id={id + 'g'} x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.9" /><Stop offset="1" stopColor="#E7EDE7" stopOpacity="0.9" /></LinearGradient>
        <LinearGradient id={id + 'lid'} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#4A524A" /><Stop offset="1" stopColor="#0B0B0B" /></LinearGradient>
      </Defs>
      <Rect x="13" y="2" width="30" height="10" rx="3.5" fill={`url(#${id}lid)`} />
      <Rect x="15" y="3.5" width="12" height="2" rx="1" fill="#fff" opacity={0.25} />
      <Path d={BODY} fill={`url(#${id}g)`} stroke="#D3DAD3" strokeWidth="1.4" />
      <G clipPath={`url(#${id}c)`}>
        <AP animatedProps={back} fill={col[0]} opacity={0.55} />
        <AP animatedProps={front} fill={`url(#${id}l)`} />
      </G>
      <Path d="M13 28v26" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" opacity={0.85} />
      <Path d="M44 30v8" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity={0.5} />
    </Svg>
  );
}
