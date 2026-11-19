import { useEffect } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

/** Shimmering placeholder block. */
export function Skeleton({ style, dark }: { style?: StyleProp<ViewStyle>; dark?: boolean }) {
  const x = useSharedValue(0);
  useEffect(() => { x.value = withRepeat(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.quad) }), -1); }, []);
  const a = useAnimatedStyle(() => ({ transform: [{ translateX: interpolate(x.value, [0, 1], [-300, 400]) }] }));
  return (
    <View style={[{ backgroundColor: dark ? '#131A14' : '#E6EAE6', borderRadius: 20, overflow: 'hidden' }, style]}>
      <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, width: 200 }, a]}>
        <LinearGradient colors={['transparent', dark ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.7)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
      </Animated.View>
    </View>
  );
}

export function HomeSkeleton() {
  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}><Skeleton style={{ width: 50, height: 50, borderRadius: 25 }} /><View style={{ gap: 6 }}><Skeleton style={{ width: 90, height: 10 }} /><Skeleton style={{ width: 140, height: 18 }} /></View></View>
      <Skeleton dark style={{ height: 420, borderRadius: 32 }} />
      <Skeleton style={{ height: 58, borderRadius: 29 }} />
      <Skeleton style={{ height: 140, borderRadius: 28 }} />
    </View>
  );
}
