import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useStore } from '@/lib/store';
import { markAsked, openNativeReview } from '@/lib/rating';
import { C, TYPE } from '@/lib/theme';
import { success } from '@/lib/fx';
import { Sheet } from './Sheet';
import { Cta, Ghost } from './ui';
import { Icon } from './Icon';
import { IlloTrophy } from './Illustrations';

/**
 * Shown right after a win (a day closed under allowance, with enough usage behind it).
 * Deliberately neutral: everyone sees the same "Rate" button, which opens the native review dialog.
 * Filtering people by sentiment before the store prompt ("review gating") breaks Google Play policy
 * and Apple's guidelines, so feedback lives in Settings instead.
 */
export function RatingSheet() {
  const open = useStore((s) => s.ratingPrompt); const set = useStore((s) => s.setRatingPrompt);
  useEffect(() => { if (open) markAsked(); }, [open]);
  const close = () => set(false);
  return (
    <Sheet visible={open} onClose={close}>
      <View style={{ alignItems: 'center', paddingTop: 4 }}>
        <IlloTrophy size={160} />
        <Text style={[TYPE.h1, { textAlign: 'center', marginTop: 4 }]}>Another day under budget</Text>
        <Text style={[TYPE.body, { color: C.muted, textAlign: 'center', marginTop: 6, paddingHorizontal: 8 }]}>
          Small wins like this add up. If Kwik Budget is helping, a quick rating helps other people find it.
        </Text>
        <Animated.View entering={FadeInDown.delay(250).springify()} style={{ flexDirection: 'row', gap: 6, marginTop: 14 }}>
          {[0, 1, 2, 3, 4].map((i) => <Icon key={i} name="star" size={26} color={C.gold} sw={1.8} />)}
        </Animated.View>
      </View>
      <View style={{ marginTop: 20 }}>
        <Cta title="Rate Kwik Budget" icon="heart" onPress={() => { success(); close(); setTimeout(openNativeReview, 350); }} />
      </View>
      <Ghost title="Not now" color={C.muted} onPress={close} />
    </Sheet>
  );
}
