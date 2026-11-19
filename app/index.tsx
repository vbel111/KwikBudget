import { Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { LogoMark } from '@/components/LogoMark';
import { F } from '@/lib/theme';

/** Shown for the moment between the splash screen and the first real screen: the jar keeps collecting coins. */
export default function Index() {
  return (
    <View style={{ flex: 1, backgroundColor: '#060806', alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View entering={FadeIn.duration(300)} style={{ alignItems: 'center', gap: 14 }}>
        <LogoMark size={64} />
        <Text style={{ fontFamily: F.x, fontSize: 18, color: '#fff' }}>Kwik Budget</Text>
      </Animated.View>
    </View>
  );
}
