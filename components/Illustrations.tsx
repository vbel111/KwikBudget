import { ReactNode, useEffect, useId } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';

/*
 * Kwik Budget illustration set.
 * One consistent style: soft clay-like 3D with a top-left key light, a white specular highlight on every object,
 * a contact shadow on the ground, and only brand colours (greens, gold, ink, white).
 */

const useUid = () => useId().replace(/[^a-zA-Z0-9]/g, '');

/** Gentle idle bob so illustrations feel alive without stealing attention. */
export function Floaty({ children, amp = 6, duration = 2600, delay = 0, style }: { children: ReactNode; amp?: number; duration?: number; delay?: number; style?: StyleProp<ViewStyle> }) {
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withDelay(delay, withRepeat(withSequence(
      withTiming(-amp, { duration: duration / 2, easing: Easing.inOut(Easing.sin) }),
      withTiming(0, { duration: duration / 2, easing: Easing.inOut(Easing.sin) })), -1));
  }, []);
  const a = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return <Animated.View style={[style, a]}>{children}</Animated.View>;
}

/* ---------- shared pieces ---------- */
function GreenDefs({ id }: { id: string }) {
  return (
    <>
      <RadialGradient id={`${id}gf`} cx="35%" cy="28%" r="80%"><Stop offset="0" stopColor="#EFFFD6" /><Stop offset="0.45" stopColor="#5BE466" /><Stop offset="1" stopColor="#0D7A26" /></RadialGradient>
      <LinearGradient id={`${id}gs`} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#1DB33A" /><Stop offset="1" stopColor="#0A5E1B" /></LinearGradient>
      <RadialGradient id={`${id}au`} cx="35%" cy="28%" r="80%"><Stop offset="0" stopColor="#FFF6C9" /><Stop offset="0.45" stopColor="#FFCF2E" /><Stop offset="1" stopColor="#C98A00" /></RadialGradient>
      <LinearGradient id={`${id}aus`} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#E0A100" /><Stop offset="1" stopColor="#9C6A00" /></LinearGradient>
      <LinearGradient id={`${id}ink`} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#3A423A" /><Stop offset="1" stopColor="#060806" /></LinearGradient>
      <RadialGradient id={`${id}sh`} cx="50%" cy="50%" r="50%"><Stop offset="0" stopColor="#0B0B0B" stopOpacity="0.22" /><Stop offset="1" stopColor="#0B0B0B" stopOpacity="0" /></RadialGradient>
    </>
  );
}
const Ground = ({ id, cx, cy, rx, ry = 8 }: { id: string; cx: number; cy: number; rx: number; ry?: number }) => <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${id}sh)`} />;
const Sparkle = ({ x, y, s = 1, color = '#FFD43B' }: { x: number; y: number; s?: number; color?: string }) => (
  <Path d="M0-9C1-3 3-1 9 0 3 1 1 3 0 9-1 3-3 1-9 0-3-1-1-3 0-9z" fill={color} transform={`translate(${x} ${y}) scale(${s})`} />
);

/** Front-facing coin with thickness, rim, embossed $ and a specular highlight. */
function Coin({ id, cx, cy, r, gold }: { id: string; cx: number; cy: number; r: number; gold?: boolean }) {
  const face = gold ? `url(#${id}au)` : `url(#${id}gf)`; const side = gold ? `url(#${id}aus)` : `url(#${id}gs)`;
  return (
    <G>
      <Circle cx={cx} cy={cy + r * 0.14} r={r} fill={side} />
      <Circle cx={cx} cy={cy} r={r} fill={face} />
      <Circle cx={cx} cy={cy} r={r * 0.78} fill="none" stroke={gold ? '#B37C00' : '#0F7F27'} strokeOpacity={0.35} strokeWidth={r * 0.06} />
      <SvgText x={cx + r * 0.03} y={cy + r * 0.36} fontSize={r * 1.05} fontWeight="800" textAnchor="middle" fill={gold ? '#8A5E00' : '#08400F'} opacity={0.4}>$</SvgText>
      <SvgText x={cx} y={cy + r * 0.32} fontSize={r * 1.05} fontWeight="800" textAnchor="middle" fill="#fff">$</SvgText>
      <Path d={`M${cx - r * 0.62} ${cy - r * 0.3} A ${r * 0.7} ${r * 0.7} 0 0 1 ${cx - r * 0.1} ${cy - r * 0.7}`} stroke="#fff" strokeOpacity={0.75} strokeWidth={r * 0.1} strokeLinecap="round" fill="none" />
    </G>
  );
}

/** A coin lying flat (for stacks). */
function FlatCoin({ id, cx, cy, rx, h = 9, gold }: { id: string; cx: number; cy: number; rx: number; h?: number; gold?: boolean }) {
  const ry = rx * 0.34;
  return (
    <G>
      <Path d={`M${cx - rx} ${cy} V${cy + h} A${rx} ${ry} 0 0 0 ${cx + rx} ${cy + h} V${cy} Z`} fill={gold ? `url(#${id}aus)` : `url(#${id}gs)`} />
      {[0.25, 0.5, 0.75].map((f) => <Path key={f} d={`M${cx - rx + 2} ${cy + h * f} A${rx} ${ry} 0 0 0 ${cx + rx - 2} ${cy + h * f}`} stroke="#000" strokeOpacity={0.08} strokeWidth={1} fill="none" />)}
      <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={gold ? `url(#${id}au)` : `url(#${id}gf)`} />
      <Ellipse cx={cx} cy={cy} rx={rx * 0.72} ry={ry * 0.72} fill="none" stroke="#fff" strokeOpacity={0.35} strokeWidth={1.5} />
    </G>
  );
}

type P = { size?: number };

/* ---------- illustrations ---------- */

/** Coin stacks and a hero coin. Welcome, plan reveal, extra income. */
export function IlloCoins({ size = 200 }: P) {
  const id = useUid();
  return (
    <Svg width={size} height={size * 0.8} viewBox="0 0 200 160">
      <Defs><GreenDefs id={id} /></Defs>
      <Ground id={id} cx={100} cy={146} rx={86} ry={9} />
      {[0, 1, 2, 3].map((i) => <FlatCoin key={'a' + i} id={id} cx={52} cy={128 - i * 11} rx={26} />)}
      {[0, 1, 2, 3, 4, 5].map((i) => <FlatCoin key={'b' + i} id={id} cx={146} cy={128 - i * 11} rx={26} gold={i % 2 === 1} />)}
      <Coin id={id} cx={100} cy={70} r={42} />
      <Sparkle x={160} y={30} s={1.2} /><Sparkle x={36} y={48} s={0.8} color="#fff" /><Sparkle x={128} y={18} s={0.6} color="#9BE878" />
    </Svg>
  );
}

/** Shield with a lock: bills protected first. */
export function IlloVault({ size = 200 }: P) {
  const id = useUid();
  const shield = 'M100 14C122 26 144 30 160 30C160 88 140 124 100 146C60 124 40 88 40 30C56 30 78 26 100 14Z';
  return (
    <Svg width={size} height={size * 0.8} viewBox="0 0 200 160">
      <Defs><GreenDefs id={id} />
        <LinearGradient id={`${id}sd`} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#C4F89B" /><Stop offset="0.55" stopColor="#3DDC4A" /><Stop offset="1" stopColor="#0E8A2A" /></LinearGradient>
      </Defs>
      <Ground id={id} cx={100} cy={152} rx={70} ry={7} />
      <Coin id={id} cx={34} cy={110} r={18} gold /><Coin id={id} cx={170} cy={96} r={14} />
      <Path d={shield} fill="#0A5E1B" transform="translate(0 5)" />
      <Path d={shield} fill={`url(#${id}sd)`} />
      <Path d="M100 26C118 36 136 40 148 40C147 86 131 115 100 133Z" fill="#fff" opacity={0.18} />
      <Rect x={74} y={74} width={52} height={42} rx={12} fill={`url(#${id}ink)`} />
      <Path d="M84 76V64a16 16 0 0 1 32 0v12" stroke="#0B0B0B" strokeWidth={8} fill="none" strokeLinecap="round" />
      <Path d="M84 76V64a16 16 0 0 1 32 0v12" stroke="#4A524A" strokeWidth={3} fill="none" strokeLinecap="round" transform="translate(-1 -1)" />
      <Circle cx={100} cy={92} r={6} fill="#3DDC4A" /><Rect x={97.5} y={94} width={5} height={11} rx={2.5} fill="#3DDC4A" />
      <Path d="M80 80h28" stroke="#fff" strokeOpacity={0.18} strokeWidth={3} strokeLinecap="round" />
      <Sparkle x={150} y={30} s={1} /><Sparkle x={46} y={58} s={0.6} color="#fff" />
    </Svg>
  );
}

const JAR = 'M12 12h32v6c4 2 6 5 6 9v28a8 8 0 0 1-8 8H14a8 8 0 0 1-8-8V27c0-4 2-7 6-9z';
function JarShape({ id, x, y, s, fill, c1, c2, k }: { id: string; x: number; y: number; s: number; fill: number; c1: string; c2: string; k: string }) {
  const top = 64 - (64 - 20) * fill;
  return (
    <G transform={`translate(${x} ${y}) scale(${s})`}>
      <Defs>
        <LinearGradient id={`${id}${k}l`} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={c1} /><Stop offset="1" stopColor={c2} /></LinearGradient>
      </Defs>
      <Rect x={13} y={2} width={30} height={10} rx={4} fill={`url(#${id}ink)`} />
      <Path d={JAR} fill="#F4F8F4" stroke="#D5DBD5" strokeWidth={1.4} />
      <Path d={`M6 ${top + 2}c8-4 16 4 22 0s14-4 22 0V55a8 8 0 0 1-8 8H14a8 8 0 0 1-8-8z`} fill={`url(#${id}${k}l)`} />
      <Path d={`M6 ${top + 2}c8-4 16 4 22 0s14-4 22 0`} stroke="#fff" strokeOpacity={0.5} strokeWidth={1.5} fill="none" />
      <Path d="M13 27v26" stroke="#fff" strokeWidth={3.4} strokeLinecap="round" opacity={0.85} />
      <Path d="M44 30v10" stroke="#fff" strokeWidth={2} strokeLinecap="round" opacity={0.5} />
    </G>
  );
}

/** Three jars filling up: food, transport and fun. */
export function IlloJars({ size = 200 }: P) {
  const id = useUid();
  return (
    <Svg width={size} height={size * 0.8} viewBox="0 0 200 160">
      <Defs><GreenDefs id={id} /></Defs>
      <Ground id={id} cx={100} cy={148} rx={88} ry={8} />
      <JarShape id={id} k="a" x={6} y={60} s={1.25} fill={0.55} c1="#FFE680" c2="#F2B705" />
      <JarShape id={id} k="b" x={62} y={34} s={1.6} fill={0.75} c1="#C4F89B" c2="#1DB33A" />
      <JarShape id={id} k="c" x={140} y={68} s={1.1} fill={0.35} c1="#D9D2FF" c2="#7B6CF0" />
      <Coin id={id} cx={108} cy={18} r={13} gold />
      <Sparkle x={42} y={40} s={0.8} /><Sparkle x={176} y={50} s={0.6} color="#9BE878" />
    </Svg>
  );
}

/** Calendar card with payday marked by a coin. */
export function IlloCalendar({ size = 200 }: P) {
  const id = useUid();
  const cells = Array.from({ length: 15 }, (_, i) => i);
  return (
    <Svg width={size} height={size * 0.8} viewBox="0 0 200 160">
      <Defs><GreenDefs id={id} /></Defs>
      <Ground id={id} cx={100} cy={150} rx={72} ry={7} />
      <Rect x={40} y={30} width={124} height={112} rx={20} fill="#D5DBD5" />
      <Rect x={36} y={24} width={124} height={112} rx={20} fill="#fff" />
      <Path d="M36 44a20 20 0 0 1 20-20h84a20 20 0 0 1 20 20v8H36z" fill={`url(#${id}ink)`} />
      <Rect x={62} y={14} width={8} height={22} rx={4} fill="#3DDC4A" /><Rect x={126} y={14} width={8} height={22} rx={4} fill="#3DDC4A" />
      {cells.map((i) => {
        const col = i % 5, row = Math.floor(i / 5); const x = 48 + col * 21, y = 62 + row * 22;
        const paid = i === 1 || i === 3; const today = i === 7;
        return (
          <G key={i}>
            <Rect x={x} y={y} width={16} height={16} rx={5} fill={today ? '#0B0B0B' : paid ? '#E4F8E6' : '#F1F4F1'} />
            {paid && <Path d={`M${x + 4} ${y + 8.5}l3 3 5-6`} stroke="#167A27" strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
          </G>
        );
      })}
      <Coin id={id} cx={152} cy={122} r={22} gold />
      <Sparkle x={178} y={92} s={0.8} />
    </Svg>
  );
}

/** Chat bubbles: type "lunch 8", get a saved card. */
export function IlloChat({ size = 200 }: P) {
  const id = useUid();
  return (
    <Svg width={size} height={size * 0.8} viewBox="0 0 200 160">
      <Defs><GreenDefs id={id} /></Defs>
      <Ground id={id} cx={100} cy={150} rx={78} ry={7} />
      <Path d="M76 18h92a16 16 0 0 1 16 16v20a16 16 0 0 1-16 16h-6l2 12-14-12H76a16 16 0 0 1-16-16V34a16 16 0 0 1 16-16z" fill={`url(#${id}ink)`} />
      <SvgText x={122} y={50} fontSize={17} fontWeight="800" textAnchor="middle" fill="#fff">lunch 8</SvgText>
      <Rect x={18} y={78} width={136} height={60} rx={18} fill="#D5DBD5" transform="translate(3 4)" />
      <Rect x={18} y={78} width={136} height={60} rx={18} fill="#fff" />
      <Rect x={30} y={90} width={36} height={36} rx={12} fill="#DDF7C8" />
      <Path d="M40 104h16v5a7 7 0 0 1-7 7h-2a7 7 0 0 1-7-7zM56 106h2a3 3 0 0 1 0 6h-2" stroke="#0B0B0B" strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Rect x={76} y={96} width={44} height={8} rx={4} fill="#0B0B0B" /><Rect x={76} y={110} width={30} height={7} rx={3.5} fill="#C9CEC9" />
      <Circle cx={150} cy={80} r={14} fill="#3DDC4A" /><Path d="M143 80l5 5 9-10" stroke="#0B0B0B" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Sparkle x={30} y={30} s={0.9} />
    </Svg>
  );
}

/** Bell for reminders. */
export function IlloBell({ size = 200 }: P) {
  const id = useUid();
  return (
    <Svg width={size} height={size * 0.8} viewBox="0 0 200 160">
      <Defs><GreenDefs id={id} />
        <LinearGradient id={`${id}bl`} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#FFF0A8" /><Stop offset="0.5" stopColor="#FFCF2E" /><Stop offset="1" stopColor="#C98A00" /></LinearGradient>
      </Defs>
      <Ground id={id} cx={100} cy={150} rx={56} ry={7} />
      <Path d="M58 46c-9 8-14 18-15 30M142 46c9 8 14 18 15 30" stroke="#9BE878" strokeWidth={5} strokeLinecap="round" fill="none" />
      <Path d="M48 34c-12 11-19 25-20 42M152 34c12 11 19 25 20 42" stroke="#C4F89B" strokeWidth={4} strokeLinecap="round" fill="none" opacity={0.7} />
      <Circle cx={100} cy={136} r={11} fill={`url(#${id}aus)`} />
      <Path d="M100 22c-24 0-40 18-40 44v26l-12 16h104l-12-16V66c0-26-16-44-40-44z" fill={`url(#${id}bl)`} />
      <Rect x={46} y={106} width={108} height={14} rx={7} fill={`url(#${id}aus)`} />
      <Circle cx={100} cy={20} r={7} fill={`url(#${id}aus)`} />
      <Path d="M74 52c4-10 12-16 22-18" stroke="#fff" strokeOpacity={0.8} strokeWidth={6} strokeLinecap="round" fill="none" />
      <Circle cx={140} cy={36} r={16} fill="#3DDC4A" stroke="#fff" strokeWidth={4} />
      <SvgText x={140} y={42} fontSize={16} fontWeight="800" textAnchor="middle" fill="#0B0B0B">1</SvgText>
    </Svg>
  );
}

/** Trophy for streaks and weekly wins. */
export function IlloTrophy({ size = 200 }: P) {
  const id = useUid();
  return (
    <Svg width={size} height={size * 0.8} viewBox="0 0 200 160">
      <Defs><GreenDefs id={id} />
        <LinearGradient id={`${id}cup`} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#FFF3B8" /><Stop offset="0.45" stopColor="#FFC81E" /><Stop offset="1" stopColor="#B57D00" /></LinearGradient>
      </Defs>
      <Ground id={id} cx={100} cy={150} rx={60} ry={7} />
      <Path d="M62 34H44a4 4 0 0 0-4 4c0 22 12 34 30 36M138 34h18a4 4 0 0 1 4 4c0 22-12 34-30 36" stroke="#C98A00" strokeWidth={8} fill="none" strokeLinecap="round" />
      <Path d="M60 24h80v30c0 26-18 44-40 44S60 80 60 54z" fill={`url(#${id}cup)`} />
      <Path d="M72 32v20c0 14 8 26 18 30" stroke="#fff" strokeOpacity={0.7} strokeWidth={6} strokeLinecap="round" fill="none" />
      <Rect x={92} y={96} width={16} height={20} fill="#C98A00" />
      <Rect x={66} y={114} width={68} height={24} rx={8} fill={`url(#${id}ink)`} />
      <Rect x={80} y={121} width={40} height={8} rx={4} fill="#3DDC4A" />
      <Path d="M100 40l5 10 11 2-8 8 2 11-10-5-10 5 2-11-8-8 11-2z" fill="#fff" />
      {[[30, 30, '#3DDC4A', 20], [168, 24, '#FFD43B', -30], [40, 96, '#9BE878', 45], [164, 92, '#0B0B0B', 15], [150, 60, '#3DDC4A', 60]].map(([x, y, c, r], i) => (
        <Rect key={i} x={x as number} y={y as number} width={8} height={14} rx={2} fill={c as string} transform={`rotate(${r} ${x} ${y})`} />
      ))}
    </Svg>
  );
}

/** Crown on a glowing pedestal for Kwik Budget Pro. */
export function IlloCrown({ size = 200 }: P) {
  const id = useUid();
  return (
    <Svg width={size} height={size * 0.8} viewBox="0 0 200 160">
      <Defs><GreenDefs id={id} />
        <RadialGradient id={`${id}glow`} cx="50%" cy="50%" r="50%"><Stop offset="0" stopColor="#3DDC4A" stopOpacity="0.55" /><Stop offset="1" stopColor="#3DDC4A" stopOpacity="0" /></RadialGradient>
        <LinearGradient id={`${id}cr`} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#FFF3B8" /><Stop offset="0.5" stopColor="#FFC81E" /><Stop offset="1" stopColor="#B57D00" /></LinearGradient>
      </Defs>
      <Circle cx={100} cy={78} r={76} fill={`url(#${id}glow)`} />
      <Ellipse cx={100} cy={134} rx={58} ry={14} fill="#0A5E1B" />
      <Ellipse cx={100} cy={128} rx={58} ry={14} fill={`url(#${id}gf)`} />
      <Path d="M48 104L40 46l34 26 26-40 26 40 34-26-8 58z" fill={`url(#${id}cr)`} />
      <Rect x={46} y={100} width={108} height={18} rx={6} fill="#C98A00" />
      <Rect x={46} y={98} width={108} height={14} rx={6} fill={`url(#${id}cr)`} />
      <Path d="M56 60l4 30" stroke="#fff" strokeOpacity={0.7} strokeWidth={5} strokeLinecap="round" />
      <Circle cx={100} cy={78} r={10} fill="#3DDC4A" stroke="#fff" strokeWidth={3} />
      <Circle cx={70} cy={86} r={6} fill="#0B0B0B" /><Circle cx={130} cy={86} r={6} fill="#0B0B0B" />
      <Circle cx={40} cy={46} r={6} fill={`url(#${id}cr)`} /><Circle cx={100} cy={30} r={7} fill={`url(#${id}cr)`} /><Circle cx={160} cy={46} r={6} fill={`url(#${id}cr)`} />
      <Sparkle x={26} y={24} s={1} /><Sparkle x={176} y={110} s={0.8} color="#fff" /><Sparkle x={168} y={20} s={0.6} color="#9BE878" />
    </Svg>
  );
}

/** Empty receipt with a magnifier for empty states. */
export function IlloEmpty({ size = 160 }: P) {
  const id = useUid();
  return (
    <Svg width={size} height={size * 0.8} viewBox="0 0 200 160">
      <Defs><GreenDefs id={id} /></Defs>
      <Ground id={id} cx={96} cy={150} rx={60} ry={7} />
      <Path d="M54 18h84v116l-10-8-10 8-11-8-11 8-11-8-11 8-10-8-10 8z" fill="#CDD3CD" transform="translate(5 5)" />
      <Path d="M54 18h84v116l-10-8-10 8-11-8-11 8-11-8-11 8-10-8-10 8z" fill="#FAFCFA" stroke="#DDE3DD" strokeWidth={1.5} strokeLinejoin="round" />
      <Rect x={68} y={36} width={40} height={8} rx={4} fill="#0B0B0B" />
      {[56, 72, 88].map((y) => <Rect key={y} x={68} y={y} width={56} height={6} rx={3} fill="#E3E8E3" />)}
      <Circle cx={140} cy={104} r={22} fill="#E4F8E6" stroke={`url(#${id}ink)`} strokeWidth={8} />
      <Path d="M156 120l18 18" stroke={`url(#${id}ink)`} strokeWidth={10} strokeLinecap="round" />
      <Path d="M130 96a12 12 0 0 1 10-6" stroke="#fff" strokeWidth={4} strokeLinecap="round" fill="none" />
    </Svg>
  );
}
