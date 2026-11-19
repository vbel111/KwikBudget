import { Image, View } from 'react-native';
import { shadow } from '@/lib/theme';

/** The Kwik Budget app icon (coin jar), used wherever the brand mark appears in the UI. */
export function Logo({ size = 38, radius }: { size?: number; radius?: number }) {
  const r = radius ?? Math.round(size * 0.24);
  return (
    <View style={[{ width: size, height: size, borderRadius: r }, shadow.soft]}>
      <Image source={require('../assets/icon.png')} style={{ width: size, height: size, borderRadius: r }} accessibilityLabel="Kwik Budget" />
    </View>
  );
}
