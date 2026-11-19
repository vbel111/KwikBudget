import { ReactNode, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { Easing, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, TYPE } from '@/lib/theme';
import { IconBtn } from './ui';

/**
 * Bottom sheet with real physics: springs up, follows your finger, rubber-bands when pulled up,
 * and dismisses on a fast flick or a long drag. The backdrop dims in step with the drag.
 */
export function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  const ins = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const y = useSharedValue(800);
  const h = useSharedValue(600);

  useEffect(() => {
    if (visible) { setMounted(true); y.value = 800; requestAnimationFrame(() => { y.value = withSpring(0, { damping: 20, stiffness: 190, mass: 0.9 }); }); }
    else if (mounted) y.value = withTiming(h.value + 40, { duration: 220, easing: Easing.in(Easing.quad) }, (f) => { if (f) runOnJS(setMounted)(false); });
  }, [visible]);

  const pan = Gesture.Pan()
    .onUpdate((e) => { y.value = e.translationY < 0 ? e.translationY * 0.2 : e.translationY; })
    .onEnd((e) => {
      if (e.translationY > h.value * 0.3 || e.velocityY > 900) runOnJS(onClose)();
      else y.value = withSpring(0, { damping: 18, stiffness: 220 });
    });

  const sheet = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const backdrop = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [0, h.value], [1, 0], 'clamp') }));

  if (!mounted) return null;
  return (
    <Modal transparent visible statusBarTranslucent animationType="none" onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(6,8,6,.5)' }, backdrop]}>
          <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close" />
        </Animated.View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
          <Animated.View onLayout={(e) => { h.value = e.nativeEvent.layout.height; }} style={[{ backgroundColor: '#fff', borderTopLeftRadius: 34, borderTopRightRadius: 34, paddingHorizontal: 20, paddingBottom: ins.bottom + 18 }, sheet]}>
            <GestureDetector gesture={pan}>
              <View style={{ paddingTop: 10, paddingBottom: 6 }}>
                <View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: '#D5D9D5', alignSelf: 'center' }} />
                {title && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                    <Text style={TYPE.h2}>{title}</Text>
                    <IconBtn name="close" label="Close" onPress={onClose} size={38} />
                  </View>
                )}
              </View>
            </GestureDetector>
            {children}
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}
export const sheetBg = C.white;
