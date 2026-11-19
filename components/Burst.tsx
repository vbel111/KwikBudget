import { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

const COLORS = ['#3DDC4A', '#C4F89B', '#FFD43B', '#0B0B0B', '#9BE878', '#FFFFFF'];

// Deterministic pseudo-random so each piece keeps its own personality across renders.
const rnd = (i: number, s: number) => { const x = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453; return x - Math.floor(x); };

/**
 * Physical confetti: pieces launch from an origin with random velocity, fall under gravity with drag,
 * and flutter (3D rotateX/rotateY) so paper catches the light. Runs fully on the UI thread.
 */
function Piece({ i, ox, oy, power }: { i: number; ox: number; oy: number; power: number }) {
  const t = useSharedValue(0);
  const ang = -Math.PI / 2 + (rnd(i, 1) - 0.5) * Math.PI * 1.1;
  const v = (0.55 + rnd(i, 2) * 0.6) * power;
  const vx = Math.cos(ang) * v, vy = Math.sin(ang) * v;
  const spin = (rnd(i, 3) - 0.5) * 1440, flutter = 4 + rnd(i, 4) * 6;
  const w = 6 + rnd(i, 5) * 6, h = rnd(i, 6) > 0.6 ? w : w * 1.8;
  const dur = 1700 + rnd(i, 7) * 900;
  useEffect(() => { t.value = withDelay(rnd(i, 8) * 90, withTiming(1, { duration: dur, easing: Easing.linear })); }, []);
  const a = useAnimatedStyle(() => {
    const s = t.value * (dur / 1000);
    const drag = 1 - Math.exp(-2.2 * s);
    const x = (vx / 2.2) * drag;
    const y = (vy / 2.2) * drag + 520 * s * s * 0.5;
    return {
      opacity: t.value < 0.8 ? 1 : 1 - (t.value - 0.8) * 5,
      transform: [{ translateX: x }, { translateY: y }, { rotateZ: `${spin * t.value}deg` }, { rotateX: `${Math.sin(s * flutter) * 70}deg` }, { rotateY: `${Math.cos(s * flutter * 0.7) * 50}deg` }],
    };
  });
  return <Animated.View style={[{ position: 'absolute', left: ox, top: oy, width: w, height: h, borderRadius: h === w ? w / 2 : 2, backgroundColor: COLORS[i % COLORS.length] }, a]} />;
}

/** Mount with a new `key` to fire again. */
export function Burst({ n = 48, origin = 'center', power = 900 }: { n?: number; origin?: 'center' | 'top' | 'bottom'; power?: number }) {
  const { width, height } = useWindowDimensions();
  const oy = origin === 'top' ? height * 0.25 : origin === 'bottom' ? height * 0.78 : height * 0.45;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: n }, (_, i) => <Piece key={i} i={i} ox={width / 2} oy={oy} power={power} />)}
    </View>
  );
}
