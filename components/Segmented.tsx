import { useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { C, F, shadow } from '@/lib/theme';
import { Press } from './ui';

/** Segmented control with a thumb that springs between options. */
export function Segmented<T extends string>({ options, value, onChange }: { options: { key: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const [w, setW] = useState(0);
  const idx = Math.max(0, options.findIndex((o) => o.key === value));
  const seg = w / options.length;
  const thumb = useAnimatedStyle(() => ({ width: seg - 6, transform: [{ translateX: withSpring(idx * seg + 3, { damping: 18, stiffness: 220 }) }] }));
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: 46, borderRadius: 23, backgroundColor: '#E6EAE6', flexDirection: 'row' }}>
      {w > 0 && <Animated.View style={[{ position: 'absolute', top: 3, bottom: 3, borderRadius: 20, backgroundColor: '#fff' }, shadow.soft, thumb]} />}
      {options.map((o) => (
        <Press key={o.key} onPress={() => onChange(o.key)} label={o.label} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} scale={0.94}>
          <Text style={{ fontFamily: o.key === value ? F.x : F.s, fontSize: 13, color: o.key === value ? C.ink : C.muted }}>{o.label}</Text>
        </Press>
      ))}
    </View>
  );
}
