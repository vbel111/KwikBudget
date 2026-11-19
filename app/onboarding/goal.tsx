import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Screen } from '@/components/Screen';
import { Steps } from '@/components/Steps';
import { Cta, Press } from '@/components/ui';
import { Icon, IconName } from '@/components/Icon';
import { IlloCoins, Floaty } from '@/components/Illustrations';
import { Goal, useDraft } from '@/lib/draft';
import { C, F, TYPE, shadow } from '@/lib/theme';
import { success } from '@/lib/fx';

const GOALS: { key: Goal; icon: IconName; title: string; sub: string; tint: string }[] = [
  { key: 'payday', icon: 'clock', title: 'Stop running out before payday', sub: 'Know what you can spend each day', tint: '#DDF7C8' },
  { key: 'save', icon: 'jar', title: 'Save without thinking about it', sub: 'Savings set aside the day you get paid', tint: '#FFF1BF' },
  { key: 'bills', icon: 'shield', title: 'Never be short for bills', sub: 'Bills locked away before you spend', tint: '#E9E6FF' },
  { key: 'track', icon: 'receipt', title: 'See where my money goes', sub: 'Log spending in two seconds', tint: '#DFF1FF' },
];

function GoalCard({ g, on, i, onPress }: { g: typeof GOALS[number]; on: boolean; i: number; onPress: () => void }) {
  const ring = useAnimatedStyle(() => ({ borderColor: on ? C.ink : 'transparent', transform: [{ scale: withSpring(on ? 1 : 0.985, { damping: 12 }) }] }));
  const tick = useAnimatedStyle(() => ({ transform: [{ scale: withSpring(on ? 1 : 0, { damping: 10, stiffness: 260 }) }] }));
  return (
    <Animated.View entering={FadeInDown.delay(150 + i * 70).springify().damping(16)}>
      <Press onPress={onPress} label={g.title} scale={0.97}>
        <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 24, backgroundColor: '#fff', borderWidth: 2 }, shadow.soft, ring]}>
          <View style={{ width: 48, height: 48, borderRadius: 17, backgroundColor: g.tint, alignItems: 'center', justifyContent: 'center' }}><Icon name={g.icon} size={22} /></View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.b, fontSize: 15, color: C.ink }}>{g.title}</Text>
            <Text style={[TYPE.small, { marginTop: 2 }]}>{g.sub}</Text>
          </View>
          <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: on ? C.ink : '#D5DBD5', alignItems: 'center', justifyContent: 'center' }}>
            <Animated.View style={[{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' }, tick]}>
              <Icon name="check" size={15} color={C.green} sw={3} />
            </Animated.View>
          </View>
        </Animated.View>
      </Press>
    </Animated.View>
  );
}

export default function GoalStep() {
  const r = useRouter(); const d = useDraft();
  return (
    <Screen bottom={120} footer={<Cta title="Continue" icon="arrow" disabled={d.goals.length === 0} onPress={() => { success(); r.push('/onboarding/payday'); }} />}>
      <Steps n={1} back={r.canGoBack()} />
      <Floaty style={{ alignItems: 'center', marginTop: 10 }}><IlloCoins size={170} /></Floaty>
      <Animated.Text entering={FadeInDown.springify()} style={[TYPE.h1, { marginTop: 4 }]}>What would make money feel easier?</Animated.Text>
      <Animated.Text entering={FadeInDown.delay(60).springify()} style={[TYPE.body, { color: C.muted, marginTop: 6 }]}>Pick all that apply. We will shape your plan around it.</Animated.Text>
      <View style={{ gap: 10, marginTop: 18 }}>
        {GOALS.map((g, i) => <GoalCard key={g.key} g={g} i={i} on={d.goals.includes(g.key)} onPress={() => d.toggleGoal(g.key)} />)}
      </View>
    </Screen>
  );
}
