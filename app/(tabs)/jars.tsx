import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';
import { Screen } from '@/components/Screen';
import { Header } from '@/components/Header';
import { Card, DarkCard, IconBtn, Press, Rise, SectionTitle } from '@/components/ui';
import { Odometer } from '@/components/Odometer';
import { Jar } from '@/components/Jar';
import { Icon } from '@/components/Icon';
import { AmountSheet } from '@/components/AmountSheet';
import { useStore } from '@/lib/store';
import { fmtDay, moneyShort, snapshot } from '@/lib/money';
import { C, F, JAR_DOT, TYPE } from '@/lib/theme';
import { success } from '@/lib/fx';

function Meter({ f, color, i }: { f: number; color: string; i: number }) {
  const w = useSharedValue(0);
  useEffect(() => { w.value = withDelay(300 + i * 80, withSpring(Math.max(0, Math.min(1, f)), { damping: 16, stiffness: 80 })); }, [f]);
  const a = useAnimatedStyle(() => ({ width: `${w.value * 100}%` as any }));
  return <View style={{ height: 6, borderRadius: 3, backgroundColor: '#EEF1EE', overflow: 'hidden', marginTop: 10 }}><Animated.View style={[{ height: 6, borderRadius: 3, backgroundColor: color }, a]} /></View>;
}

export default function Jars() {
  const r = useRouter(); const { cycle, jars, txs, moves, bills, incomes, addIncome } = useStore();
  const [income, setIncome] = useState(false);
  const snap = useMemo(() => (cycle ? snapshot(cycle, jars, txs, moves, bills, incomes) : null), [cycle, jars, txs, moves, bills, incomes]);
  if (!cycle || !snap) return null;
  const open = jars.filter((j) => !j.locked); const locked = jars.filter((j) => j.locked);
  const buffer = jars.find((j) => j.key === 'buffer');
  return (
    <Screen bottom={130}>
      <Rise><Header kicker={`Until payday · ${fmtDay(cycle.payday)}`} title="Your jars" right={<IconBtn name="repeat" label="Move money" onPress={() => r.push('/move')} />} /></Rise>
      <Rise i={1}>
        <DarkCard style={{ marginTop: 14, padding: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View><Text style={{ fontFamily: F.r, color: '#C3CAC3', fontSize: 12 }}>Spendable</Text><Odometer value={snap.spendable} size={26} color="#fff" centsColor="#9AA29A" /></View>
            <View style={{ width: 1, height: 42, backgroundColor: 'rgba(255,255,255,.18)' }} />
            <View style={{ alignItems: 'flex-end' }}><Text style={{ fontFamily: F.r, color: '#C3CAC3', fontSize: 12 }}>{snap.daysLeft} days · per day</Text><Odometer value={snap.allowance} size={26} color={C.lime} centsColor="#6FBF57" /></View>
          </View>
          <Press onPress={() => setIncome(true)} label="Add extra income" style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,.1)', borderRadius: 14, paddingHorizontal: 12, height: 34 }}>
            <Icon name="plus" size={14} color={C.green} sw={2.6} /><Text style={{ fontFamily: F.b, fontSize: 12, color: '#fff' }}>Got extra money?{snap.extraIncome > 0 ? `  +${moneyShort(snap.extraIncome)} so far` : ''}</Text>
          </Press>
        </DarkCard>
      </Rise>

      <SectionTitle title="Spend from these" action="Move money" onAction={() => r.push('/move')} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {open.map((j, i) => {
          const left = snap.jarLeft[j.id]; const cap = Math.max(j.budget, left, 1);
          return (
            <Rise key={j.id} i={i + 2} style={{ width: '48.4%' }}>
              <Press onPress={() => r.push(`/jar/${j.id}`)} label={`${j.name} jar`} scale={0.96}>
                <Card style={{ padding: 14, borderRadius: 26 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontFamily: F.x, fontSize: 15 }}>{j.name}</Text>
                    <Jar id={`j${j.key}`} fill={left / cap} k={j.key} width={44} />
                  </View>
                  <Text style={{ fontFamily: F.x, fontSize: 22, letterSpacing: -0.6, marginTop: -6, color: left < 0 ? C.danger : C.ink }}>{moneyShort(left)}</Text>
                  <Text style={TYPE.small}>left of {moneyShort(j.budget)}</Text>
                  <Meter f={left / cap} color={JAR_DOT[j.key]} i={i} />
                </Card>
              </Press>
            </Rise>
          );
        })}
      </View>

      <SectionTitle title="Protected" />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {locked.map((j, i) => (
          <Rise key={j.id} i={i + 7} style={{ flex: 1 }}>
            <Press onPress={() => (j.key === 'bills' ? r.push('/(tabs)/bills') : r.push(`/jar/${j.id}`))} label={j.name}>
              <Card style={{ padding: 16, borderRadius: 24 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: j.key === 'bills' ? C.ink : C.softGreen, alignItems: 'center', justifyContent: 'center' }}><Icon name="lock" size={16} color={j.key === 'bills' ? C.green : C.deepGreen} /></View>
                  <Icon name="chevron" size={18} color={C.faint} />
                </View>
                <Text style={{ fontFamily: F.x, fontSize: 14, marginTop: 10 }}>{j.name}</Text>
                <Text style={TYPE.small}>{j.key === 'bills' ? 'Still to pay' : 'Saved this cycle'}</Text>
                <Text style={{ fontFamily: F.x, fontSize: 19, marginTop: 4 }}>{moneyShort(j.key === 'bills' ? snap.billsDue : snap.jarLeft[j.id])}</Text>
              </Card>
            </Press>
          </Rise>
        ))}
      </View>
      <AmountSheet visible={income} onClose={() => setIncome(false)} title="Add extra income" cta="Add to Buffer" presets={[20, 50, 100]} noteLabel="Where from? (tips, refund, side gig)"
        hint="It goes into your Buffer jar and raises your daily number right away."
        onSubmit={async (n, note) => { if (!buffer || n <= 0) return false; const ok = await addIncome(buffer.id, n, note || 'Extra income'); if (ok) success(); return ok; }} />
    </Screen>
  );
}
