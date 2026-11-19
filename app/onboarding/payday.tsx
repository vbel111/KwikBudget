import { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import type { ScrollViewInstance } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, LinearTransition, ZoomIn, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '@/components/Screen';
import { Steps } from '@/components/Steps';
import { Card, Cta, Press } from '@/components/ui';
import { Segmented } from '@/components/Segmented';
import { CurrencySheet } from '@/components/CurrencySheet';
import { Icon } from '@/components/Icon';
import { FREQ_DAYS, paydayStr, useDraft } from '@/lib/draft';
import { CURRENCIES, money, parseDay, setCurrency } from '@/lib/money';
import { C, F, TYPE, shadow } from '@/lib/theme';
import { success, tap } from '@/lib/fx';
import type { PayFrequency } from '@/lib/types';

function DateChip({ offset, on, onPress }: { offset: number; on: boolean; onPress: () => void }) {
  const d = parseDay(paydayStr(offset));
  const a = useAnimatedStyle(() => ({ transform: [{ scale: withSpring(on ? 1.06 : 1, { damping: 12 }) }, { translateY: withSpring(on ? -3 : 0) }] }));
  return (
    <Press onPress={onPress} label={d.toDateString()} haptic={false}>
      <Animated.View style={[{ width: 58, height: 74, borderRadius: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#fff' }, on ? shadow.dark : shadow.soft, a]}>
        {on && <LinearGradient colors={['#2C322C', '#050605']} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />}
        <Text style={{ fontFamily: F.s, fontSize: 11, color: on ? '#9BE878' : C.muted }}>{d.toLocaleDateString('en-US', { weekday: 'short' })}</Text>
        <Text style={{ fontFamily: F.x, fontSize: 22, color: on ? '#fff' : C.ink }}>{d.getDate()}</Text>
        <Text style={{ fontFamily: F.s, fontSize: 10, color: on ? '#C3CAC3' : C.faint }}>{d.toLocaleDateString('en-US', { month: 'short' })}</Text>
      </Animated.View>
    </Press>
  );
}

export default function Payday() {
  const r = useRouter(); const d = useDraft();
  const [cur, setCur] = useState(false);
  const [text, setText] = useState(d.income ? String(d.income) : '');
  const list = useRef<ScrollViewInstance>(null);
  const sym = CURRENCIES.find((c) => c.code === d.currency)?.symbol ?? '$';
  useEffect(() => { setCurrency(d.currency); }, [d.currency]);
  useEffect(() => { list.current?.scrollTo({ x: Math.max(0, (d.paydayOffset - 4) * 66), animated: true }); }, [d.frequency]);
  const perDay = d.income > 0 ? d.income / Math.max(1, d.paydayOffset) : 0;

  return (
    <Screen bottom={130} footer={<Cta title="Continue" icon="arrow" disabled={!(d.income > 0)} onPress={() => { success(); r.push('/onboarding/bills'); }} />}>
      <Steps n={2} />
      <Animated.Text entering={FadeInDown.springify()} style={[TYPE.h1, { marginTop: 22 }]}>Let's set up your pay</Animated.Text>
      <Animated.Text entering={FadeInDown.delay(60).springify()} style={[TYPE.body, { color: C.muted, marginTop: 6 }]}>Your daily number is everything you can spend, spread evenly until your next payday.</Animated.Text>

      <Text style={[TYPE.caption, { marginTop: 22, marginBottom: 8 }]}>How often are you paid</Text>
      <Segmented<PayFrequency> value={d.frequency} onChange={(f) => { tap(); d.setFrequency(f); }}
        options={[{ key: 'weekly', label: 'Weekly' }, { key: 'biweekly', label: '2 weeks' }, { key: 'monthly', label: 'Monthly' }, { key: 'irregular', label: 'Varies' }]} />

      <Text style={[TYPE.caption, { marginTop: 22, marginBottom: 8 }]}>Next payday</Text>
      <ScrollView ref={list} horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -18 }} contentContainerStyle={{ paddingHorizontal: 18, paddingVertical: 8, gap: 8 }}>
        {Array.from({ length: Math.max(FREQ_DAYS[d.frequency] + 10, 20) }, (_, i) => i + 2).map((o) => (
          <DateChip key={o} offset={o} on={d.paydayOffset === o} onPress={() => { tap(); d.setPayday(o); }} />
        ))}
      </ScrollView>

      <Text style={[TYPE.caption, { marginTop: 16, marginBottom: 8 }]}>Money to last until then</Text>
      <Card style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <LinearGradient colors={['#D3FAB4', '#4EE05A']} style={{ width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: F.x, fontSize: 18 }}>{sym}</Text></LinearGradient>
        <TextInput keyboardType="decimal-pad" value={text} placeholder="0" placeholderTextColor="#C9CEC9"
          onChangeText={(t) => { const v = t.replace(/[^0-9.]/g, ''); setText(v); d.setIncome(Number(v) || 0); }}
          style={{ flex: 1, fontFamily: F.x, fontSize: 32, letterSpacing: -1, padding: 0, color: C.ink }} />
        <Press onPress={() => setCur(true)} label="Change currency">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.softGreen, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 }}>
            <Text style={{ fontFamily: F.b, fontSize: 12, color: C.deepGreen }}>{d.currency}</Text><Icon name="chevron" size={14} color={C.deepGreen} />
          </View>
        </Press>
      </Card>
      <Text style={[TYPE.small, { marginTop: 8, paddingHorizontal: 4 }]}>Your take-home pay, or what is in your account now if payday is close.</Text>

      {perDay > 0 && (
        <Animated.View entering={ZoomIn.springify().damping(14)} layout={LinearTransition.springify()} style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 20, backgroundColor: C.softGreen }}>
          <Icon name="sparkles" size={18} color={C.deepGreen} />
          <Text style={{ flex: 1, fontFamily: F.s, fontSize: 13, color: C.deepGreen, lineHeight: 19 }}>
            That's about <Text style={{ fontFamily: F.x }}>{money(perDay)}</Text> a day before bills. Next, let's protect those bills.
          </Text>
        </Animated.View>
      )}
      <CurrencySheet visible={cur} value={d.currency} onClose={() => setCur(false)} onPick={(c) => { d.setCurrencyCode(c); setCurrency(c); }} />
    </Screen>
  );
}
