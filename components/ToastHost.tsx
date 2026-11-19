import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeOutUp, SlideInUp, useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '@/lib/store';
import { C, F, shadow } from '@/lib/theme';
import { Icon } from './Icon';
import { Press } from './ui';

/** App-wide toast with an optional action (Undo) and a draining timer bar. */
export function ToastHost() {
  const ins = useSafeAreaInsets();
  const toast = useStore((s) => s.toast); const hide = useStore((s) => s.hideToast);
  const t = useSharedValue(1);
  useEffect(() => {
    if (!toast) return;
    t.value = 1; t.value = withTiming(0, { duration: 4000, easing: Easing.linear });
    const id = setTimeout(hide, 4000);
    return () => clearTimeout(id);
  }, [toast?.id]);
  const bar = useAnimatedStyle(() => ({ transform: [{ scaleX: t.value }] }));
  if (!toast) return null;
  const err = toast.tone === 'error';
  return (
    <Animated.View key={toast.id} entering={SlideInUp.springify().damping(16)} exiting={FadeOutUp.duration(180)}
      style={[{ position: 'absolute', top: ins.top + 8, left: 16, right: 16, borderRadius: 22, backgroundColor: err ? '#2A0F10' : C.ink2, overflow: 'hidden' }, shadow.dark]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 16 }}>
        <Icon name={err ? 'warn' : 'check'} color={err ? '#FF8A8A' : C.green} size={18} sw={2.4} />
        <Text style={{ flex: 1, fontFamily: F.b, fontSize: 14, color: '#fff' }}>{toast.text}</Text>
        {toast.action && <Press onPress={() => { toast.action!.run(); hide(); }} label={toast.action.label}><Text style={{ fontFamily: F.x, fontSize: 14, color: C.green }}>{toast.action.label}</Text></Press>}
      </View>
      <Animated.View style={[{ height: 3, backgroundColor: err ? '#FF8A8A' : C.green, transformOrigin: 'left' }, bar]} />
    </Animated.View>
  );
}
