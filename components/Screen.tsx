import { ReactNode } from 'react';
import { ScrollView, StyleProp, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '@/lib/theme';

export function Screen({ children, scroll = true, pad = 18, bottom = 24, style, footer }: {
  children: ReactNode; scroll?: boolean; pad?: number; bottom?: number; style?: StyleProp<ViewStyle>; footer?: ReactNode;
}) {
  const ins = useSafeAreaInsets();
  const body = { paddingTop: ins.top + 8, paddingHorizontal: pad, paddingBottom: bottom };
  return (
    <LinearGradient colors={['#F8F9F8', '#EEF0EE']} style={{ flex: 1 }}>
      {scroll ? <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[body, style as any]}>{children}</ScrollView>
        : <View style={[{ flex: 1 }, body, style]}>{children}</View>}
      {footer && <View style={{ position: 'absolute', left: 18, right: 18, bottom: Math.max(ins.bottom, 12) + 8 }}>{footer}</View>}
    </LinearGradient>
  );
}
export const bgFlat = C.bg;
