import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import type { ComponentProps } from 'react';
import type { Tabs } from 'expo-router';
import Animated, { useAnimatedStyle, useDerivedValue, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Press } from './ui';
import { Icon, IconName } from './Icon';
import { C, F, shadow } from '@/lib/theme';
import { tap } from '@/lib/fx';

const META: Record<string, { icon: IconName; label: string }> = {
  today: { icon: 'home', label: 'Today' }, jars: { icon: 'jar', label: 'Jars' }, chat: { icon: 'add', label: 'Log' },
  bills: { icon: 'bills', label: 'Bills' }, insights: { icon: 'insights', label: 'Insights' },
};
const W = 58;
/** Derived from expo-router itself so it stays correct across SDK upgrades (no direct React Navigation import). */
type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

function Tab({ name, focused, onPress, onLayout }: { name: string; focused: boolean; onPress: () => void; onLayout: (x: number) => void }) {
  const m = META[name];
  const a = useAnimatedStyle(() => ({ transform: [{ translateY: withSpring(focused ? -20 : 0, { damping: 13, stiffness: 190 }) }] }));
  const lbl = useAnimatedStyle(() => ({ opacity: withSpring(focused ? 0 : 1), transform: [{ scale: withSpring(focused ? 0.6 : 1) }] }));
  return (
    <View onLayout={(e) => onLayout(e.nativeEvent.layout.x + e.nativeEvent.layout.width / 2)} style={{ flex: 1, alignItems: 'center' }}>
      <Press onPress={onPress} label={m.label} haptic={false} style={{ width: W, height: 56, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={a}><Icon name={m.icon} color={focused ? C.green : C.ink} size={23} /></Animated.View>
        <Animated.Text style={[{ fontFamily: F.s, fontSize: 10, color: C.muted, marginTop: 3, position: 'absolute', bottom: 2 }, lbl]}>{m.label}</Animated.Text>
      </Press>
    </View>
  );
}

/** Tab bar with a single raised black "puck" that slides between tabs on a spring, plus a glowing log button. */
export function TabBar({ state, navigateToTab }: TabBarProps) {
  const ins = useSafeAreaInsets();
  const [xs, setXs] = useState<Record<number, number>>({});
  const active = state.routes[state.index]?.name;
  const tx = useDerivedValue(() => withSpring((xs[state.index] ?? 0) - W / 2, { damping: 17, stiffness: 170, mass: 0.9 }));
  const puck = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }], opacity: active === 'chat' || xs[state.index] == null ? 0 : 1 }));

  // Expo Router 58 tab bar API: navigateToTab(routeKey) switches tabs.
  const go = (_name: string, key: string, i: number) => {
    tap();
    if (state.index !== i) navigateToTab(key);
  };

  return (
    <View style={[st.bar, { paddingBottom: Math.max(ins.bottom, 10) }, shadow.card]}>
      <View style={[StyleSheet.absoluteFill, { borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden' }]}>
        {Platform.OS === 'ios' ? <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFill} /> : null}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,.82)' : '#fff' }]} />
      </View>
      <Animated.View pointerEvents="none" style={[st.puck, shadow.dark, puck]}>
        <LinearGradient colors={['#2C322C', '#050605']} style={[StyleSheet.absoluteFill, { borderRadius: 26 }]} />
        <View style={{ position: 'absolute', top: 1, left: 12, right: 12, height: 1, backgroundColor: 'rgba(255,255,255,.2)' }} />
      </Animated.View>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6 }}>
        {state.routes.map((r, i) => r.name === 'chat' ? (
          <View key={r.key} style={{ flex: 1, alignItems: 'center' }} onLayout={(e) => { const x = e.nativeEvent.layout.x + e.nativeEvent.layout.width / 2; setXs((p) => (p[i] === x ? p : { ...p, [i]: x })); }}>
            <Press onPress={() => go(r.name, r.key, i)} label="Log spending" scale={0.9}>
              <LinearGradient colors={[C.mint, C.green, C.green2]} style={[{ width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', marginTop: -6 }, shadow.glow]}>
                <Icon name="plus" size={26} sw={2.6} />
              </LinearGradient>
            </Press>
          </View>
        ) : (
          <Tab key={r.key} name={r.name} focused={state.index === i} onPress={() => go(r.name, r.key, i)}
            onLayout={(x) => setXs((p) => (p[i] === x ? p : { ...p, [i]: x }))} />
        ))}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 10, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  puck: { position: 'absolute', top: -14, left: 0, width: W, height: 64, borderRadius: 26 },
});
export const TAB_SPACE = 110;
