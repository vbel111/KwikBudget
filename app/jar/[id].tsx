import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';
import { Screen } from '@/components/Screen';
import { Card, Cta, DarkCard, GreenPanel, IconBtn, Pill, Press, Rise, SectionTitle, T } from '@/components/ui';
import { Odometer } from '@/components/Odometer';
import { Jar } from '@/components/Jar';
import { Icon } from '@/components/Icon';
import { TxRow } from '@/components/TxRow';
import { TxSheet } from '@/components/TxSheet';
import { AmountSheet } from '@/components/AmountSheet';
import { IlloEmpty } from '@/components/Illustrations';
import { useStore } from '@/lib/store';
import { requirePro } from '@/lib/afterLog';
import { addDays, fmtRelative, money, moneyShort, parseDay, snapshot, todayStr } from '@/lib/money';
import { C, F, TYPE } from '@/lib/theme';
import { success } from '@/lib/fx';
import type { Tx } from '@/lib/types';

function Bar({ h, i, last, label }: { h: number; i: number; last: boolean; label: string }) {
  const s = useSharedValue(0);
  useEffect(() => { s.value = withDelay(400 + i * 70, withSpring(1, { damping: 12, stiffness: 120 })); }, [h]);
  const a = useAnimatedStyle(() => ({ height: Math.max(6, h * s.value) }));
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: 70 }}>
      <Animated.View style={[{ width: 24, borderRadius: 9, backgroundColor: last ? C.ink : 'rgba(255,255,255,.6)' }, a]} />
      <Text style={{ fontFamily: F.b, fontSize: 10, marginTop: 4 }}>{label}</Text>
    </View>
  );
}

export default function JarDetail() {
  const { id } = useLocalSearchParams<{ id: string }>(); const r = useRouter();
  const { cycle, jars, txs, moves, bills, incomes, deleteTx, setJarBudget } = useStore();
  const [edit, setEdit] = useState<Tx | null>(null); const [sheet, setSheet] = useState(false); const [budget, setBudget] = useState(false);
  const snap = useMemo(() => (cycle ? snapshot(cycle, jars, txs, moves, bills, incomes) : null), [cycle, jars, txs, moves, bills, incomes]);
  const jar = jars.find((j) => j.id === id);
  if (!cycle || !snap || !jar) return null;
  const left = snap.jarLeft[jar.id]; const cap = Math.max(jar.budget, left, 1);
  const mine = txs.filter((t) => t.jar_id === jar.id);
  const days = Array.from({ length: 7 }, (_, i) => addDays(todayStr(), i - 6));
  const per = days.map((d) => mine.filter((t) => t.occurred_on === d).reduce((s, t) => s + t.amount, 0));
  const max = Math.max(1, ...per);
  const perDay = Math.max(0, left) / snap.daysLeft;
  return (
    <Screen bottom={130} footer={!jar.locked ? <Cta title="Move money" icon="repeat" onPress={() => r.push({ pathname: '/move', params: { to: jar.id } })} /> : undefined}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <IconBtn name="back" label="Back" onPress={() => r.back()} size={44} />
        <Text style={[TYPE.h2, { flex: 1 }]}>{jar.name} jar</Text>
        {!jar.locked && <Press onPress={() => { if (requirePro(r, 'jar-budget')) setBudget(true); }} label="Edit budget"><Pill tone="soft">Edit budget</Pill></Press>}
      </View>
      <Rise>
        <DarkCard style={{ marginTop: 14, height: jar.locked ? 200 : 330 }}>
          <View style={{ padding: 20 }}>
            <Text style={{ fontFamily: F.r, color: '#C3CAC3', fontSize: 13 }}>{jar.locked ? 'Locked in jar' : 'Left in jar'}</Text>
            <Odometer value={left} size={38} color={left < 0 ? '#FF8A8A' : '#fff'} centsColor="#9AA29A" />
            <Text style={{ fontFamily: F.b, color: C.lime, fontSize: 13, marginTop: 4 }}>of {moneyShort(jar.budget)} this cycle</Text>
            {!jar.locked && <View style={{ marginTop: 12, gap: 6 }}><Pill>{money(snap.jarSpent[jar.id] ?? 0)} spent</Pill><Pill>{money(perDay)} a day left</Pill></View>}
          </View>
          <View style={{ position: 'absolute', right: 22, top: 16 }}><Jar id="big" fill={left / cap} k={jar.key} width={jar.locked ? 96 : 118} /></View>
          {!jar.locked && (
            <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
              <GreenPanel style={{ height: 116, paddingHorizontal: 18 }}>
                <Text style={{ fontFamily: F.x, fontSize: 14 }}>Last 7 days</Text>
                <View style={{ flexDirection: 'row', marginTop: 2 }}>
                  {per.map((v, i) => <Bar key={i} i={i} h={(v / max) * 52} last={i === 6} label={'MTWTFSS'[(parseDay(days[i]).getDay() + 6) % 7]} />)}
                </View>
              </GreenPanel>
            </View>
          )}
        </DarkCard>
      </Rise>
      {jar.locked && (
        <Card style={{ marginTop: 12, padding: 16, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <Icon name="shield" size={22} color={C.deepGreen} />
          <T style={{ flex: 1, color: C.muted, lineHeight: 20 }}>Savings stay locked so they actually grow. You can still borrow from it in Move money if you really need to.</T>
        </Card>
      )}
      {!jar.locked && (
        <>
          <SectionTitle title="From this jar" />
          <Card style={{ paddingHorizontal: 16, overflow: 'hidden' }}>
            {mine.length === 0 && <View style={{ alignItems: 'center', paddingVertical: 16 }}><IlloEmpty size={110} /><T style={{ color: C.muted }}>No spending yet. Nice and full.</T></View>}
            {mine.slice(0, 30).map((t, i) => (
              <TxRow key={t.id} tx={t} first={i === 0} sub={fmtRelative(t.occurred_on)} onPress={() => { setEdit(t); setSheet(true); }} onDelete={() => deleteTx(t.id)} />
            ))}
          </Card>
        </>
      )}
      <TxSheet visible={sheet} tx={edit} onClose={() => setSheet(false)} />
      <AmountSheet visible={budget} onClose={() => setBudget(false)} title={`${jar.name} budget`} cta="Save budget" initial={jar.budget}
        hint="Changing a budget changes your daily number. Tip: move money between jars to keep the plan balanced."
        onSubmit={async (n) => { const ok = await setJarBudget(jar.id, n); if (ok) success(); return ok; }} />
    </Screen>
  );
}
