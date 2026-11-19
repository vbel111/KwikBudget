import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, useAnimatedStyle, withDelay, withSpring } from 'react-native-reanimated';
import { Screen } from '@/components/Screen';
import { Steps } from '@/components/Steps';
import { Card, Cta, DarkCard, Press } from '@/components/ui';
import { Odometer } from '@/components/Odometer';
import { Jar } from '@/components/Jar';
import { Icon } from '@/components/Icon';
import { Split, useDraft, billsTotal } from '@/lib/draft';
import { moneyShort, round2 } from '@/lib/money';
import { C, F, JAR_DOT, TYPE } from '@/lib/theme';
import { success, tap } from '@/lib/fx';

/** Each segment of the payday bar grows into place one after another, like money being poured. */
function Seg({ k, v, i }: { k: string; v: number; i: number }) {
  const a = useAnimatedStyle(() => ({ flexGrow: withDelay(200 + i * 110, withSpring(Math.max(v, 0.0001), { damping: 18, stiffness: 110 })) }));
  return <Animated.View style={[{ flexBasis: 0, flexGrow: 0.0001, backgroundColor: JAR_DOT[k], borderRadius: 6 }, a]} />;
}

const RATES = [0.05, 0.1, 0.125, 0.2];

export default function SplitStep() {
  const r = useRouter(); const d = useDraft();
  const bills = billsTotal(d.bills, d.paydayOffset); const s = d.split;
  if (!s) return null;
  const days = Math.max(1, d.paydayOffset);
  const spendable = round2(s.food + s.transport + s.fun + s.buffer);
  const rows: { k: keyof Split | 'bills'; name: string; v: number; locked?: boolean; note: string; step?: boolean }[] = [
    { k: 'bills', name: 'Bills', v: bills, locked: true, note: 'Locked until each is paid' },
    { k: 'savings', name: 'Savings', v: s.savings, locked: true, note: `Locked · ${Math.round(d.savingsRate * 1000) / 10}% of pay` },
    { k: 'food', name: 'Food', v: s.food, step: true, note: 'Groceries, eating out, coffee' },
    { k: 'transport', name: 'Transport', v: s.transport, step: true, note: 'Rides, fuel, transit' },
    { k: 'fun', name: 'Fun', v: s.fun, step: true, note: 'Going out, shopping, subscriptions' },
    { k: 'buffer', name: 'Buffer', v: s.buffer, note: 'Everything else, and your safety net' },
  ];
  return (
    <Screen bottom={130} footer={<Cta title="See my daily number" icon="sparkles" shine onPress={() => { success(); r.push('/onboarding/reveal'); }} />}>
      <Steps n={4} />
      <Animated.Text entering={FadeInDown.springify()} style={[TYPE.h1, { marginTop: 22 }]}>Your jars, filled for you</Animated.Text>
      <Animated.Text entering={FadeInDown.delay(60).springify()} style={[TYPE.body, { color: C.muted, marginTop: 6 }]}>We split your pay using a proven starting point. Nudge any jar, the buffer balances it.</Animated.Text>

      <DarkCard style={{ marginTop: 18, padding: 20 }}>
        <Text style={{ fontFamily: F.r, color: '#C3CAC3', fontSize: 13 }}>Payday</Text>
        <Odometer value={d.income} size={34} color="#fff" centsColor="#9AA29A" />
        <View style={{ flexDirection: 'row', height: 14, gap: 3, marginTop: 16 }}>
          {rows.map((x, i) => <Seg key={x.k} k={x.k} v={x.v} i={i} />)}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
          {rows.map((x) => <View key={x.k} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><View style={{ width: 8, height: 8, borderRadius: 3, backgroundColor: JAR_DOT[x.k] === '#0B0B0B' ? '#fff' : JAR_DOT[x.k] }} /><Text style={{ fontFamily: F.s, fontSize: 11, color: '#C3CAC3' }}>{x.name}</Text></View>)}
        </View>
      </DarkCard>

      <Text style={[TYPE.caption, { marginTop: 20, marginBottom: 8, paddingHorizontal: 4 }]}>Save each payday</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {RATES.map((rate) => {
          const on = Math.abs(d.savingsRate - rate) < 0.001;
          return (
            <Press key={rate} onPress={() => { tap(); d.setSavingsRate(rate); }} label={`Save ${rate * 100}%`} style={{ flex: 1 }}>
              <View style={{ height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? C.ink : '#fff' }}>
                <Text style={{ fontFamily: F.x, fontSize: 14, color: on ? '#fff' : C.ink }}>{rate * 100}%</Text>
              </View>
            </Press>
          );
        })}
      </View>

      <Card style={{ paddingHorizontal: 16, marginTop: 14 }}>
        {rows.map((x, i) => (
          <Animated.View key={x.k} entering={FadeInDown.delay(150 + i * 60).springify()} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 68, borderTopWidth: i ? 1 : 0, borderColor: C.line }}>
            {x.k === 'bills' || x.k === 'savings' ? (
              <View style={{ width: 34, height: 42, borderRadius: 12, backgroundColor: x.k === 'bills' ? C.ink : C.softGreen, alignItems: 'center', justifyContent: 'center' }}><Icon name="lock" size={16} color={x.k === 'bills' ? C.green : C.deepGreen} /></View>
            ) : <Jar id={`sp${x.k}`} k={x.k} fill={d.income ? Math.min(1, (x.v / d.income) * 3) : 0} width={34} />}
            <View style={{ flex: 1 }}><Text style={{ fontFamily: F.b, fontSize: 15 }}>{x.name}</Text><Text numberOfLines={1} style={TYPE.small}>{x.note}</Text></View>
            {x.step && <Press onPress={() => { tap(); d.nudge(x.k as keyof Split, -10); }} label={`Less ${x.name}`} style={st}><Icon name="minus" size={16} sw={2.6} /></Press>}
            <Text style={{ fontFamily: F.x, fontSize: 15, minWidth: 62, textAlign: 'right' }}>{moneyShort(x.v)}</Text>
            {x.step && <Press onPress={() => { tap(); d.nudge(x.k as keyof Split, 10); }} label={`More ${x.name}`} style={[st, { backgroundColor: C.softGreen }]}><Icon name="plus" size={16} sw={2.6} color={C.deepGreen} /></Press>}
          </Animated.View>
        ))}
      </Card>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, padding: 14, borderRadius: 20, backgroundColor: '#fff' }}>
        <Icon name="coin" size={18} color={C.green2} />
        <Text style={{ flex: 1, fontFamily: F.s, fontSize: 13, color: C.muted }}>Spread over {days} days, that is roughly</Text>
        <Odometer value={spendable / days} size={18} color={C.ink} />
      </View>
    </Screen>
  );
}
const st = { width: 30, height: 30, borderRadius: 15, backgroundColor: C.chip, alignItems: 'center' as const, justifyContent: 'center' as const };
