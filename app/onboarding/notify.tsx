import { useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { Screen } from '@/components/Screen';
import { Cta, Ghost } from '@/components/ui';
import { Logo } from '@/components/Logo';
import { IlloBell, Floaty } from '@/components/Illustrations';
import { enableNotifications } from '@/lib/notify';
import { useStore } from '@/lib/store';
import { money } from '@/lib/money';
import { C, F, TYPE, shadow } from '@/lib/theme';
import { success } from '@/lib/fx';

const Note = ({ i, title, body, time }: { i: number; title: string; body: string; time: string }) => (
  <Animated.View entering={FadeInRight.delay(300 + i * 220).springify().damping(15)} style={[{ flexDirection: 'row', gap: 12, padding: 14, borderRadius: 22, backgroundColor: '#fff' }, shadow.soft]}>
    <Logo size={38} radius={10} />
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ fontFamily: F.b, fontSize: 14 }}>{title}</Text><Text style={TYPE.small}>{time}</Text></View>
      <Text style={[TYPE.small, { marginTop: 2, lineHeight: 17 }]}>{body}</Text>
    </View>
  </Animated.View>
);

export default function Notify() {
  const r = useRouter(); const [busy, setBusy] = useState(false);
  const bill = useStore((s) => s.bills.find((b) => !b.paid));
  const next = () => r.replace({ pathname: '/paywall', params: { from: 'onboarding' } });
  return (
    <Screen bottom={170} footer={
      <View>
        <Cta title="Turn on reminders" icon="bell" loading={busy} onPress={async () => { setBusy(true); const ok = await enableNotifications(); setBusy(false); if (ok) success(); next(); }} />
        <Ghost title="Maybe later" color={C.muted} onPress={next} />
      </View>
    }>
      <Floaty style={{ alignItems: 'center', marginTop: 20 }}><IlloBell size={180} /></Floaty>
      <Animated.Text entering={FadeInDown.springify()} style={[TYPE.h1, { textAlign: 'center', marginTop: 8 }]}>Never be caught off guard</Animated.Text>
      <Animated.Text entering={FadeInDown.delay(60).springify()} style={[TYPE.body, { color: C.muted, textAlign: 'center', marginTop: 6 }]}>
        A heads-up before bills leave and one gentle nudge at night. Nothing else, ever.
      </Animated.Text>
      <View style={{ gap: 10, marginTop: 22 }}>
        <Note i={0} title={bill ? `${bill.name} is due tomorrow` : 'Rent is due tomorrow'} body={`${bill ? money(bill.amount) : '$800'} is already set aside.`} time="9:00" />
        <Note i={1} title="How did today go?" body="Log anything you spent so tomorrow stays accurate." time="20:00" />
        <Note i={2} title="Payday is tomorrow" body="Your new plan is one tap away." time="18:00" />
      </View>
    </Screen>
  );
}
