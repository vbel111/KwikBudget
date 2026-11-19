import { Text, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { FadeIn, FadeOut, LinearTransition, SharedValue, interpolate, useAnimatedStyle } from 'react-native-reanimated';
import { C, F } from '@/lib/theme';
import { money } from '@/lib/money';
import { catByKey } from '@/lib/categories';
import { thud } from '@/lib/fx';
import type { Jar, Tx } from '@/lib/types';
import { Icon } from './Icon';
import { CatTile, Press } from './ui';

function DeleteAction({ drag, onPress }: { drag: SharedValue<number>; onPress: () => void }) {
  const a = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(-drag.value, [0, 60, 90], [0.4, 0.9, 1.1], 'clamp') }],
    opacity: interpolate(-drag.value, [0, 40], [0, 1], 'clamp'),
  }));
  return (
    <View style={{ width: 84, alignItems: 'center', justifyContent: 'center' }}>
      <Press onPress={onPress} label="Delete">
        <Animated.View style={[{ width: 48, height: 48, borderRadius: 24, backgroundColor: C.danger, alignItems: 'center', justifyContent: 'center' }, a]}>
          <Icon name="trash" color="#fff" size={20} />
        </Animated.View>
      </Press>
    </View>
  );
}

/** Transaction row: tap to edit, swipe left to delete (with undo from the toast). */
export function TxRow({ tx, jar, first, onPress, onDelete, sub }: { tx: Tx; jar?: Jar; first?: boolean; onPress: () => void; onDelete: () => void; sub?: string }) {
  return (
    <Animated.View layout={LinearTransition.springify().damping(18)} entering={FadeIn.duration(250)} exiting={FadeOut.duration(180)}>
      <ReanimatedSwipeable friction={1.6} rightThreshold={60} overshootRight={false}
        onSwipeableWillOpen={() => thud()}
        renderRightActions={(_p, drag) => <DeleteAction drag={drag} onPress={onDelete} />}>
        <Press onPress={onPress} label={`${tx.merchant} ${money(tx.amount)}`} scale={0.98} haptic={false}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, height: 64, backgroundColor: '#fff', borderTopWidth: first ? 0 : 1, borderColor: C.line }}>
            <CatTile category={tx.category} />
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ fontFamily: F.b, fontSize: 15, color: C.ink }}>{tx.merchant || catByKey(tx.category).label}</Text>
              <Text numberOfLines={1} style={{ fontFamily: F.r, fontSize: 12, color: C.muted, marginTop: 1 }}>{sub ?? `${catByKey(tx.category).label} · ${jar?.name ?? ''} jar`}</Text>
            </View>
            <Text style={{ fontFamily: F.x, fontSize: 15, color: C.ink }}>-{money(tx.amount)}</Text>
          </View>
        </Press>
      </ReanimatedSwipeable>
    </Animated.View>
  );
}
