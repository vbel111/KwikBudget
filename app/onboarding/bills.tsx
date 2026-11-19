import { Switch, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';
import { Screen } from '@/components/Screen';
import { Steps } from '@/components/Steps';
import { Card, Cta, DarkCard, Press } from '@/components/ui';
import { Odometer } from '@/components/Odometer';
import { Icon } from '@/components/Icon';
import { IlloVault, Floaty } from '@/components/Illustrations';
import { useDraft, billsTotal, paydayStr } from '@/lib/draft';
import { currencySymbol, fmtDay, round2 } from '@/lib/money';
import { C, F, TYPE } from '@/lib/theme';
import { success, tap, warn } from '@/lib/fx';

export default function Bills() {
  const r = useRouter(); const d = useDraft();
  const total = billsTotal(d.bills, d.paydayOffset); const left = round2(d.income - total);
  return (
    <Screen bottom={130} footer={<Cta title="Lock these away" icon="lock" disabled={left < 0} onPress={() => { if (left < 0) return warn(); success(); d.buildSplit(); r.push('/onboarding/split'); }} />}>
      <Steps n={3} />
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
        <View style={{ flex: 1 }}>
          <Animated.Text entering={FadeInDown.springify()} style={TYPE.h1}>Bills come first</Animated.Text>
          <Animated.Text entering={FadeInDown.delay(60).springify()} style={[TYPE.body, { color: C.muted, marginTop: 6 }]}>
            Anything due before {fmtDay(paydayStr(d.paydayOffset))} is locked away so you can't spend it by accident.
          </Animated.Text>
        </View>
        <Floaty><IlloVault size={110} /></Floaty>
      </View>

      <Card style={{ marginTop: 18, paddingHorizontal: 16 }}>
        {d.bills.map((b, i) => (
          <Animated.View key={b.key} layout={LinearTransition.springify().damping(18)} entering={FadeInDown.delay(80 + i * 45).springify()} exiting={FadeOut.duration(150)}
            style={{ minHeight: 64, borderTopWidth: i ? 1 : 0, borderColor: C.line, justifyContent: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 64, opacity: b.on ? 1 : 0.55 }}>
            <View style={{ flex: 1 }}>
              <TextInput value={b.name} placeholder="Bill name" placeholderTextColor={C.faint} onChangeText={(t) => d.setBill(b.key, { name: t })} style={{ fontFamily: F.b, fontSize: 15, padding: 0, color: C.ink }} />
              <Press onPress={() => { tap(); d.setBill(b.key, { dueIn: b.dueIn >= d.paydayOffset ? 1 : b.dueIn + 1 }); }} label="Change due date" haptic={false}>
                <Text style={[TYPE.small, { marginTop: 3 }]}>Due {fmtDay(paydayStr(b.dueIn))}  ·  <Text style={{ color: C.deepGreen, fontFamily: F.s }}>change</Text></Text>
              </Press>
            </View>
            {/* Fixed-width amount field so every row's amount and toggle line up in a column */}
            <View style={{ width: 96, flexDirection: 'row', alignItems: 'center', backgroundColor: C.chip, borderRadius: 12, paddingHorizontal: 10, height: 38 }}>
              <Text style={{ fontFamily: F.x, fontSize: 14, color: C.muted }}>{currencySymbol()}</Text>
              <TextInput keyboardType="decimal-pad" value={b.amount ? String(b.amount) : ''} placeholder="0" placeholderTextColor={C.faint}
                onChangeText={(t) => d.setBill(b.key, { amount: Number(t.replace(/[^0-9.]/g, '')) || 0 })}
                style={{ flex: 1, fontFamily: F.x, fontSize: 15, padding: 0, marginLeft: 4, textAlign: 'right', color: C.ink, fontVariant: ['tabular-nums'] }} />
            </View>
            <Switch value={b.on} onValueChange={(v) => { tap(); d.setBill(b.key, { on: v }); }} trackColor={{ true: C.green, false: '#D5D9D5' }} thumbColor="#fff" ios_backgroundColor="#D5D9D5" />
            </View>
          </Animated.View>
        ))}
        <Press onPress={() => { tap(); d.addBill(); }} label="Add a bill" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 54, borderTopWidth: 1, borderColor: C.line }}>
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.softGreen, alignItems: 'center', justifyContent: 'center' }}><Icon name="plus" size={16} color={C.deepGreen} sw={2.6} /></View>
          <Text style={{ fontFamily: F.b, fontSize: 14, color: C.deepGreen }}>Add a bill</Text>
        </Press>
      </Card>

      <DarkCard style={{ marginTop: 14, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View><Text style={{ fontFamily: F.r, color: '#C3CAC3', fontSize: 12, marginBottom: 2 }}>Locked for bills</Text><Odometer value={total} size={24} color="#fff" cents={false} /></View>
        <View style={{ width: 1, height: 40, backgroundColor: 'rgba(255,255,255,.18)' }} />
        <View style={{ alignItems: 'flex-end' }}><Text style={{ fontFamily: F.r, color: '#C3CAC3', fontSize: 12, marginBottom: 2 }}>Left to plan</Text><Odometer value={left} size={24} color={left < 0 ? '#FF8A8A' : C.lime} cents={false} /></View>
      </DarkCard>
      {left < 0 && <Text style={{ fontFamily: F.s, fontSize: 13, color: C.danger, marginTop: 8, paddingHorizontal: 4 }}>Your bills are more than your income. Switch off anything paid after payday.</Text>}
    </Screen>
  );
}
