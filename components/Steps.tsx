import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { C, F } from '@/lib/theme';
import { IconBtn } from './ui';

/** Onboarding progress: a single bar that springs forward, with a little pop on the step counter. */
export function Steps({ n, total = 5, back = true }: { n: number; total?: number; back?: boolean }) {
  const r = useRouter();
  const w = useSharedValue((n - 1) / total); const pop = useSharedValue(1);
  useEffect(() => {
    w.value = withDelay(150, withSpring(n / total, { damping: 16, stiffness: 90 }));
    pop.value = withSequence(withSpring(1.25, { damping: 6, stiffness: 300 }), withSpring(1));
  }, [n]);
  const a = useAnimatedStyle(() => ({ width: `${w.value * 100}%` as any }));
  const p = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      {back ? <IconBtn name="back" label="Back" onPress={() => r.back()} size={44} /> : <View style={{ width: 44 }} />}
      <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: '#DCE1DC', overflow: 'hidden' }}>
        <Animated.View style={[{ height: 8, borderRadius: 4, overflow: 'hidden' }, a]}>
          <LinearGradient colors={[C.mint, C.green, C.green2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
        </Animated.View>
      </View>
      <Animated.View style={p}><Text style={{ fontFamily: F.b, fontSize: 13, color: C.muted }}>{n} of {total}</Text></Animated.View>
    </View>
  );
}
