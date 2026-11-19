import { useEffect } from 'react';
import { StyleProp, TextInput, TextStyle } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import { C, F } from '@/lib/theme';

const AnimatedInput = Animated.createAnimatedComponent(TextInput);

/** Numbers roll up to their value on the UI thread (no re-renders per frame). */
export function CountUp({ value, decimals = 2, prefix = '$', duration = 900, style }: {
  value: number; decimals?: number; prefix?: string; duration?: number; style?: StyleProp<TextStyle>;
}) {
  const sv = useSharedValue(0);
  useEffect(() => { sv.value = withTiming(value, { duration, easing: Easing.out(Easing.cubic) }); }, [value]);
  const props = useAnimatedProps(() => {
    const v = sv.value;
    const s = Math.abs(v).toFixed(decimals);
    const [i, f] = s.split('.');
    const body = i.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (f ? '.' + f : '');
    const text = (v < 0 ? '-' : '') + prefix + body;
    return { text, defaultValue: text } as any;
  });
  return (
    <AnimatedInput editable={false} pointerEvents="none" underlineColorAndroid="transparent"
      style={[{ fontFamily: F.x, fontSize: 32, color: C.ink, padding: 0, margin: 0 }, style]} animatedProps={props} />
  );
}
