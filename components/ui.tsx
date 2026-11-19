import { ReactNode, useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, TextInput, TextInputProps, TextStyle, View, ViewStyle } from 'react-native';
import Animated, {
  Easing, FadeInDown, interpolate, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { C, F, SPRING, TYPE, shadow } from '@/lib/theme';
import { tap } from '@/lib/fx';
import { catByKey } from '@/lib/categories';
import { Icon, IconName, categoryIcon } from './Icon';

const AP = Animated.createAnimatedComponent(Pressable);

/** Every tappable surface compresses on touch, springs back with overshoot, and ticks a haptic. */
export function Press({ children, onPress, onLongPress, style, disabled, haptic = true, label, scale = 0.96 }: {
  children: ReactNode; onPress?: () => void; onLongPress?: () => void; style?: StyleProp<ViewStyle>; disabled?: boolean;
  haptic?: boolean; label?: string; scale?: number;
}) {
  const s = useSharedValue(1);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <AP
      accessibilityRole="button" accessibilityLabel={label} disabled={disabled}
      onPressIn={() => { s.value = withSpring(scale, SPRING.snappy); }}
      onPressOut={() => { s.value = withSpring(1, { damping: 9, stiffness: 260 }); }}
      onPress={() => { if (haptic) tap(); onPress?.(); }} onLongPress={onLongPress}
      style={[style, a, disabled && { opacity: 0.45 }]}
    >
      {children}
    </AP>
  );
}

/** Staggered spring entrance used for cards and rows. */
export const Rise = ({ i = 0, children, style }: { i?: number; children: ReactNode; style?: StyleProp<ViewStyle> }) => (
  <Animated.View entering={FadeInDown.delay(60 + i * 55).springify().damping(17).stiffness(150)} style={style}>{children}</Animated.View>
);

export const Card = ({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) => (
  <View style={[st.card, shadow.card, style]}>{children}</View>
);

export const DarkCard = ({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) => (
  <View style={[st.dark, shadow.dark, style]}>
    <LinearGradient colors={[C.dark1, C.dark2, C.dark3]} start={{ x: 0.85, y: 0 }} end={{ x: 0.3, y: 1 }} style={StyleSheet.absoluteFill} />
    <View pointerEvents="none" style={st.darkSheen} />
    {children}
  </View>
);

export const GreenPanel = ({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) => (
  <LinearGradient colors={[C.mint, '#58E462', C.green2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[{ borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 16 }, style]}>
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 20, right: 20, height: 1, backgroundColor: 'rgba(255,255,255,.7)' }} />
    {children}
  </LinearGradient>
);

export const Pill = ({ children, tone = 'glass', style }: { children: ReactNode; tone?: 'glass' | 'green' | 'soft' | 'gold' | 'danger'; style?: StyleProp<ViewStyle> }) => {
  const bg = { glass: 'rgba(255,255,255,.12)', green: C.green, soft: C.softGreen, gold: C.softGold, danger: C.softDanger }[tone];
  const fg = { glass: '#E3E8E3', green: C.ink, soft: C.deepGreen, gold: C.warnInk, danger: C.danger }[tone];
  return <View style={[st.pill, { backgroundColor: bg }, style]}><Text style={{ fontFamily: F.b, fontSize: 11, color: fg }}>{children}</Text></View>;
};

export function IconBtn({ name, onPress, label, dark, size = 46 }: { name: IconName; onPress?: () => void; label: string; dark?: boolean; size?: number }) {
  return (
    <Press label={label} onPress={onPress} style={[st.ib, { width: size, height: size, borderRadius: size / 2 }, dark ? { backgroundColor: 'rgba(255,255,255,.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,.16)' } : shadow.soft]}>
      <Icon name={name} color={dark ? '#fff' : C.ink} size={20} />
    </Press>
  );
}

/** Primary button. `shine` adds a slow light sweep, used on the paywall and plan reveal. */
export function Cta({ title, onPress, disabled, dark, loading, shine, icon }: {
  title: string; onPress?: () => void; disabled?: boolean; dark?: boolean; loading?: boolean; shine?: boolean; icon?: IconName;
}) {
  const x = useSharedValue(0);
  useEffect(() => { if (shine) x.value = withRepeat(withSequence(withDelay(1400, withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) })), withTiming(0, { duration: 0 })), -1); }, [shine]);
  const sweep = useAnimatedStyle(() => ({ transform: [{ translateX: interpolate(x.value, [0, 1], [-160, 460]) }, { rotate: '18deg' }] }));
  return (
    <Press onPress={onPress} disabled={disabled || loading} label={title} scale={0.97}>
      <View style={[st.cta, !dark && shadow.glow, { overflow: 'hidden' }]}>
        <LinearGradient colors={dark ? ['#2C322C', '#050605'] : [C.mint, '#4EE05A', C.green2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        {shine && <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: -20, bottom: -20, width: 60, backgroundColor: 'rgba(255,255,255,.45)' }, sweep]} />}
        {loading ? <ActivityIndicator color={dark ? '#fff' : C.ink} /> : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontFamily: F.x, fontSize: 17, color: dark ? '#fff' : C.ink }}>{title}</Text>
            {icon && <Icon name={icon} size={18} sw={2.4} color={dark ? '#fff' : C.ink} />}
          </View>
        )}
      </View>
    </Press>
  );
}

export const Ghost = ({ title, onPress, color = C.deepGreen }: { title: string; onPress: () => void; color?: string }) => (
  <Press onPress={onPress} label={title} style={{ height: 46, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 }}>
    <Text style={{ fontFamily: F.b, fontSize: 15, color }}>{title}</Text>
  </Press>
);

export const H = ({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) => <Text style={[TYPE.h3, style]}>{children}</Text>;
export const T = ({ children, style, numberOfLines }: { children: ReactNode; style?: StyleProp<TextStyle>; numberOfLines?: number }) => (
  <Text numberOfLines={numberOfLines} style={[{ fontFamily: F.r, fontSize: 14, color: C.ink }, style]}>{children}</Text>
);

export const SectionTitle = ({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, marginBottom: 10, paddingHorizontal: 4 }}>
    <H>{title}</H>
    {action && <Press onPress={onAction} label={action}><Text style={{ fontFamily: F.b, fontSize: 13, color: C.deepGreen }}>{action}</Text></Press>}
  </View>
);

/** Tinted rounded tile holding a category icon. */
export const CatTile = ({ category, size = 42 }: { category: string; size?: number }) => {
  const c = catByKey(category);
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.36, backgroundColor: c.tint, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={categoryIcon(category)} size={size * 0.46} color={C.ink} />
    </View>
  );
};

export function Chip({ label, on, onPress, icon }: { label: string; on?: boolean; onPress: () => void; icon?: IconName }) {
  return (
    <Press onPress={onPress} label={label}>
      <View style={[st.chip, on ? { backgroundColor: C.ink } : { backgroundColor: '#fff', ...shadow.soft }]}>
        {icon && <Icon name={icon} size={15} color={on ? C.green : C.ink} />}
        <Text style={{ fontFamily: F.b, fontSize: 13, color: on ? '#fff' : C.ink }}>{label}</Text>
      </View>
    </Press>
  );
}

export function Field(props: TextInputProps & { label?: string; big?: boolean }) {
  const { label, big, style, ...rest } = props;
  return (
    <View style={{ backgroundColor: C.chip, borderRadius: 20, paddingHorizontal: 16, paddingVertical: label ? 10 : 0, minHeight: 54, justifyContent: 'center' }}>
      {label && <Text style={TYPE.small}>{label}</Text>}
      <TextInput placeholderTextColor={C.faint} {...rest} style={[{ fontFamily: big ? F.x : F.b, fontSize: big ? 28 : 16, color: C.ink, padding: 0 }, style]} />
    </View>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 28 },
  dark: { borderRadius: 32, overflow: 'hidden', backgroundColor: C.dark2 },
  darkSheen: { position: 'absolute', top: 0, left: 24, right: 24, height: 1, backgroundColor: 'rgba(255,255,255,.18)' },
  pill: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5, alignSelf: 'flex-start' },
  ib: { backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  cta: { height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  chip: { height: 38, paddingHorizontal: 14, borderRadius: 19, flexDirection: 'row', alignItems: 'center', gap: 6 },
});
