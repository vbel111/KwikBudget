import { useEffect } from 'react';
import Animated, { Easing, useAnimatedProps, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle, ClipPath, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

const AP = Animated.createAnimatedComponent(Path);
const AC = Animated.createAnimatedComponent(Circle);
const BODY = 'M12 12h32v6c4 2 6 5 6 9v28a8 8 0 0 1-8 8H14a8 8 0 0 1-8-8V27c0-4 2-7 6-9z';

/**
 * In-app brand mark: the coin jar from the app icon, redrawn in the app's own green/ink/gold palette.
 * Loop (2.8s): a gold coin drops through the lid, the liquid level ticks up and sloshes, then settles.
 * `tone` adapts the glass to dark or light backgrounds. Pass animated={false} for a static mark.
 */
export function LogoMark({ size = 40, tone = 'dark', animated = true }: { size?: number; tone?: 'dark' | 'light'; animated?: boolean }) {
  const t = useSharedValue(0.99);   // drop cycle, 0..1
  const phase = useSharedValue(0);  // continuous wave phase
  useEffect(() => {
    if (!animated) return;
    t.value = 0;
    t.value = withRepeat(withTiming(1, { duration: 2800, easing: Easing.linear }), -1);
    phase.value = withRepeat(withTiming(Math.PI * 2, { duration: 2200, easing: Easing.linear }), -1);
  }, [animated]);

  // Coin falls during 0..0.32 (ease-in, like gravity), disappears behind the lid.
  const coin = useAnimatedProps(() => {
    const k = Math.min(1, t.value / 0.32);
    const y = -10 + 20 * k * k;
    return { cy: y, opacity: t.value < 0.34 ? 1 : 0 };
  });
  const coinShine = useAnimatedProps(() => {
    const k = Math.min(1, t.value / 0.32);
    return { cy: -10 + 20 * k * k - 1.6, opacity: t.value < 0.34 ? 0.9 : 0 };
  });
  // After landing (t≈0.36) the level rises a touch and the surface sloshes, decaying back.
  const liquid = useAnimatedProps(() => {
    const since = t.value - 0.36;
    const bump = since > 0 ? Math.exp(-since * 6) : 0;
    const level = 0.5 + (since > 0 ? 0.05 * (1 - Math.exp(-since * 10)) : 0);
    const top = 64 - (64 - 20) * level;
    const amp = 1.2 + 3.2 * bump;
    let d = `M0 72 L0 ${top}`;
    for (let x = 0; x <= 56; x += 4) d += ` L${x} ${top + amp * Math.sin((x / 56) * 4 * Math.PI + phase.value)}`;
    return { d: d + ' L56 72 Z' };
  });
  // Tiny ripple ring where the coin enters.
  const ripple = useAnimatedProps(() => {
    const since = t.value - 0.34;
    const p = since > 0 && since < 0.4 ? since / 0.4 : 0;
    return { r: 2 + p * 9, opacity: p > 0 ? 0.6 * (1 - p) : 0 };
  });

  const glass = tone === 'dark' ? 'rgba(255,255,255,.10)' : '#F4F8F4';
  const stroke = tone === 'dark' ? 'rgba(255,255,255,.75)' : '#CBD3CB';
  return (
    <Svg width={size} height={size * (86 / 56)} viewBox="0 -16 56 86" accessibilityLabel="Kwik Budget">
      <Defs>
        <ClipPath id="lmClip"><Path d={BODY} /></ClipPath>
        <LinearGradient id="lmLiquid" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#C4F89B" /><Stop offset="0.55" stopColor="#4EE05A" /><Stop offset="1" stopColor="#14A432" /></LinearGradient>
        <LinearGradient id="lmLid" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#3A423A" /><Stop offset="1" stopColor="#060806" /></LinearGradient>
        <LinearGradient id="lmGold" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#FFF3B8" /><Stop offset="0.5" stopColor="#FFC81E" /><Stop offset="1" stopColor="#C98A00" /></LinearGradient>
      </Defs>
      {/* coin (drawn before the lid so it disappears into the slot) */}
      <AC animatedProps={coin} cx={28} r={6.5} fill="url(#lmGold)" stroke="#B57D00" strokeWidth={0.8} />
      <AC animatedProps={coinShine} cx={26} r={1.6} fill="#fff" />
      {/* glass */}
      <Path d={BODY} fill={glass} />
      <G clipPath="url(#lmClip)">
        <AP animatedProps={liquid} fill="url(#lmLiquid)" />
        <AC animatedProps={ripple} cx={28} cy={40} fill="none" stroke="#fff" strokeWidth={1} />
      </G>
      <Path d={BODY} fill="none" stroke={stroke} strokeWidth={1.6} />
      <Path d="M13 28v22" stroke="#fff" strokeWidth={3} strokeLinecap="round" opacity={0.8} />
      {/* lid with coin slot */}
      <Rect x={11} y={2} width={34} height={11} rx={4} fill="url(#lmLid)" stroke={tone === 'dark' ? 'rgba(255,255,255,.25)' : 'transparent'} strokeWidth={0.8} />
      <Rect x={21} y={4.5} width={14} height={2.6} rx={1.3} fill="#3DDC4A" />
    </Svg>
  );
}
