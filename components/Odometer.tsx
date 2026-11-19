import { useEffect } from 'react';
import { StyleProp, Text, TextStyle, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';
import { currencySymbol } from '@/lib/money';
import { C, F } from '@/lib/theme';

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

/** One rolling digit column. Each column springs independently with a small stagger, like a mechanical counter. */
function Digit({ d, size, color, delay, family }: { d: number; size: number; color: string; delay: number; family: string }) {
  const lh = Math.round(size * 1.18);
  const y = useSharedValue(0);
  useEffect(() => { y.value = withDelay(delay, withSpring(-d * lh, { damping: 16, stiffness: 120, mass: 0.9 })); }, [d, lh]);
  const a = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    <View style={{ height: lh, overflow: 'hidden', width: size * 0.63 }}>
      <Animated.View style={a}>
        {DIGITS.map((n) => <Text key={n} style={{ height: lh, lineHeight: lh, fontSize: size, fontFamily: family, color, textAlign: 'center', includeFontPadding: false }}>{n}</Text>)}
      </Animated.View>
    </View>
  );
}

/**
 * Money display with rolling digits. Cents render smaller and muted, as on the design.
 * Columns are keyed from the right so adding a digit (99 → 100) slides in from the left instead of re-rolling everything.
 */
export function Odometer({ value, size = 40, color = C.ink, centsColor, cents = true, prefix, style }: {
  value: number; size?: number; color?: string; centsColor?: string; cents?: boolean; prefix?: string; style?: StyleProp<TextStyle>;
}) {
  const neg = value < 0;
  const abs = Math.abs(value);
  const whole = Math.floor(abs + 1e-9).toString();
  const dec = Math.round((abs - Math.floor(abs + 1e-9)) * 100).toString().padStart(2, '0');
  const chars = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',').split('');
  const lh = Math.round(size * 1.18);
  const small = Math.round(size * 0.56);
  const sym = prefix ?? currencySymbol();
  let digitIndex = 0;
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'flex-end' }, style as any]} accessibilityLabel={`${neg ? 'minus ' : ''}${sym}${whole}.${dec}`}>
      <Text style={{ fontSize: size, lineHeight: lh, height: lh, fontFamily: F.x, color, includeFontPadding: false }}>{neg ? '-' : ''}{sym}</Text>
      {chars.map((ch, i) => {
        const key = chars.length - i;
        if (ch === ',') return <Text key={'c' + key} style={{ fontSize: size, lineHeight: lh, height: lh, fontFamily: F.x, color, includeFontPadding: false }}>,</Text>;
        const idx = digitIndex++;
        return <Digit key={'d' + key} d={Number(ch)} size={size} color={color} delay={idx * 40} family={F.x} />;
      })}
      {cents && (
        <View style={{ flexDirection: 'row', marginBottom: size * 0.1 }}>
          <Text style={{ fontSize: small, lineHeight: Math.round(small * 1.18), fontFamily: F.x, color: centsColor ?? color, includeFontPadding: false }}>.</Text>
          <Digit d={Number(dec[0])} size={small} color={centsColor ?? color} delay={120} family={F.x} />
          <Digit d={Number(dec[1])} size={small} color={centsColor ?? color} delay={160} family={F.x} />
        </View>
      )}
    </View>
  );
}
