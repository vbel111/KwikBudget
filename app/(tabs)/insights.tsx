import { useEffect, useMemo } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming, Easing } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { Screen } from '@/components/Screen';
import { Header } from '@/components/Header';
import { Card, Cta, DarkCard, GreenPanel, IconBtn, Pill, Press, Rise, SectionTitle, T } from '@/components/ui';
import { Odometer } from '@/components/Odometer';
import { Icon, categoryIcon } from '@/components/Icon';
import { IlloTrophy } from '@/components/Illustrations';
import { useStore } from '@/lib/store';
import { categoryTotals, money, moneyShort, parseDay, projection, snapshot, weekReview } from '@/lib/money';
import { catByKey } from '@/lib/categories';
import { C, F, TYPE } from '@/lib/theme';

const AC = Animated.createAnimatedComponent(Circle);
const PALETTE = ['#1DB33A', '#9BE878', '#FFC81E', '#9D90F5', '#0B0B0B', '#7BC6F5', '#FF9F7A', '#C9CEC9'];

function Col({ h, ok, i, label, today }: { h: number; ok: boolean; i: number; label: string; today: boolean }) {
  const s = useSharedValue(0);
  useEffect(() => { s.value = withDelay(300 + i * 80, withSpring(1, { damping: 11, stiffness: 110 })); }, [h]);
  const a = useAnimatedStyle(() => ({ height: Math.max(6, h * s.value) }));
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: 104 }}>
      <Animated.View style={[{ width: 28, borderRadius: 10, backgroundColor: ok ? C.ink : '#fff', borderWidth: today ? 2 : 0, borderColor: '#fff' }, a]} />
      <Text style={{ fontFamily: today ? F.x : F.b, fontSize: 10, marginTop: 4 }}>{label}</Text>
    </View>
  );
}

/** Donut whose segments draw in one after another. */
function Donut({ parts, size = 150 }: { parts: { value: number; color: string }[]; size?: number }) {
  const r = size * 0.38, sw = size * 0.16, circ = 2 * Math.PI * r, c = size / 2;
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  let acc = 0;
  return (
    <Svg width={size} height={size}>
      <Circle cx={c} cy={c} r={r} stroke="#EEF1EE" strokeWidth={sw} fill="none" />
      {parts.map((p, i) => {
        const start = acc / total; acc += p.value;
        return <Seg key={i} i={i} c={c} r={r} sw={sw} circ={circ} start={start} frac={p.value / total} color={p.color} />;
      })}
    </Svg>
  );
}
function Seg({ i, c, r, sw, circ, start, frac, color }: { i: number; c: number; r: number; sw: number; circ: number; start: number; frac: number; color: string }) {
  const p = useSharedValue(0);
  useEffect(() => { p.value = withDelay(200 + i * 140, withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) })); }, [frac]);
  const gap = frac > 0.03 ? 0.006 : 0;
  const ap = useAnimatedProps(() => ({ strokeDashoffset: circ * (1 - (frac - gap) * p.value) }));
  return <AC cx={c} cy={c} r={r} stroke={color} strokeWidth={sw} fill="none" strokeDasharray={`${circ} ${circ}`} animatedProps={ap} rotation={-90 + start * 360} originX={c} originY={c} />;
}

function Locked({ children, onUnlock }: { children: React.ReactNode; onUnlock: () => void }) {
  return (
    <View>
      <View pointerEvents="none" style={{ opacity: 0.35 }}>{children}</View>
      <LinearGradient colors={['rgba(243,245,243,0)', 'rgba(243,245,243,.95)']} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 28 }} />
      <View style={{ position: 'absolute', left: 16, right: 16, bottom: 16, alignItems: 'center' }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' }}><Icon name="crown" size={20} color={C.gold} /></View>
        <Text style={[TYPE.h3, { marginTop: 8, textAlign: 'center' }]}>See where your money really goes</Text>
        <T style={{ color: C.muted, textAlign: 'center', marginTop: 4, marginBottom: 12 }}>Category breakdown and payday forecast come with Pro.</T>
        <View style={{ alignSelf: 'stretch' }}><Cta title="Unlock insights" icon="sparkles" shine onPress={onUnlock} /></View>
      </View>
    </View>
  );
}

export default function Insights() {
  const r = useRouter(); const { cycle, jars, txs, moves, bills, incomes, pro } = useStore();
  const w = useMemo(() => (cycle ? weekReview(cycle, jars, txs) : null), [cycle, jars, txs]);
  const snap = useMemo(() => (cycle ? snapshot(cycle, jars, txs, moves, bills, incomes) : null), [cycle, jars, txs, moves, bills, incomes]);
  if (!cycle || !w || !snap) return null;
  const proj = projection(cycle, jars, txs, snap);
  const cats = categoryTotals(txs.filter((t) => jars.find((j) => j.id === t.jar_id && !j.locked)));
  const catTotal = cats.reduce((s, c) => s + c.total, 0);
  const max = Math.max(w.limit * 1.4, ...w.days.map((d) => d.spent), 1);
  const pct = (v: number) => (v / max) * 88;
  const line = 104 - 16 - pct(w.limit);
  const great = w.tracked > 0 && w.under / w.tracked >= 0.7;

  const proContent = (
    <View>
      <Card style={{ padding: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Donut parts={(cats.length ? cats : [{ key: 'other', total: 1 }]).slice(0, 8).map((c, i) => ({ value: c.total, color: cats.length ? PALETTE[i % PALETTE.length] : '#EEF1EE' }))} />
            <View style={{ position: 'absolute', alignItems: 'center' }}><Text style={TYPE.small}>Spent</Text><Text style={{ fontFamily: F.x, fontSize: 16 }}>{moneyShort(catTotal)}</Text></View>
          </View>
          <View style={{ flex: 1, gap: 8 }}>
            {cats.slice(0, 5).map((c, i) => (
              <View key={c.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: PALETTE[i % PALETTE.length] }} />
                <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.s, fontSize: 12 }}>{catByKey(c.key).label}</Text>
                <Text style={{ fontFamily: F.x, fontSize: 12 }}>{Math.round((c.total / (catTotal || 1)) * 100)}%</Text>
              </View>
            ))}
            {cats.length === 0 && <T style={{ color: C.muted }}>Log a few entries to see your mix.</T>}
          </View>
        </View>
        {cats.slice(0, 4).map((c, i) => (
          <View key={c.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, height: 52, borderTopWidth: 1, borderColor: C.line, marginTop: i === 0 ? 14 : 0 }}>
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: catByKey(c.key).tint, alignItems: 'center', justifyContent: 'center' }}><Icon name={categoryIcon(c.key)} size={17} /></View>
            <Text style={{ flex: 1, fontFamily: F.b, fontSize: 14 }}>{catByKey(c.key).label}</Text>
            <Text style={{ fontFamily: F.x, fontSize: 14 }}>{money(c.total)}</Text>
          </View>
        ))}
      </Card>
      <Card style={{ padding: 18, marginTop: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: proj.onTrack ? C.softGreen : C.softDanger, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={proj.onTrack ? 'up' : 'down'} size={20} color={proj.onTrack ? C.deepGreen : C.danger} />
          </View>
          <View style={{ flex: 1 }}><Text style={TYPE.h3}>Payday forecast</Text><Text style={TYPE.small}>At your average of {money(proj.avg)} a day</Text></View>
        </View>
        <Text style={{ fontFamily: F.r, fontSize: 14, lineHeight: 21, marginTop: 12 }}>
          {proj.onTrack ? 'You will reach payday with about ' : 'At this pace you will run short by about '}
          <Text style={{ fontFamily: F.x, color: proj.onTrack ? C.deepGreen : C.danger }}>{money(Math.abs(proj.endBalance))}</Text>
          {proj.onTrack ? ' to spare. Move some to Savings when it lands.' : '. Trimming ' + money(Math.abs(proj.endBalance) / snap.daysLeft) + ' a day fixes it.'}
        </Text>
      </Card>
    </View>
  );

  return (
    <Screen bottom={130}>
      <Rise><Header kicker="This week and this cycle" title="Insights" right={<IconBtn name="receipt" label="All entries" onPress={() => r.push('/activity')} />} /></Rise>
      <Rise i={1}>
        <DarkCard style={{ marginTop: 14, height: 360 }}>
          <View style={{ padding: 18 }}>
            <Text style={{ fontFamily: F.r, color: '#C3CAC3', fontSize: 13 }}>Days under your allowance</Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
              <Odometer value={w.under} size={40} color="#fff" prefix="" cents={false} />
              <Text style={{ fontFamily: F.x, color: '#fff', fontSize: 40, lineHeight: 47 }}>/ {w.tracked || 7}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>{great && <Pill tone="green">Strong week</Pill>}<Pill>{w.streak} day streak</Pill></View>
          </View>
          <View style={{ position: 'absolute', right: 6, top: 4 }}><IlloTrophy size={120} /></View>
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
            <GreenPanel style={{ height: 180, paddingHorizontal: 18 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ fontFamily: F.x, fontSize: 14 }}>Daily spend vs limit</Text><Text style={{ fontFamily: F.b, fontSize: 12 }}>Limit {money(w.limit)}</Text></View>
              <View style={{ marginTop: 10 }}>
                <View style={{ position: 'absolute', left: 0, right: 0, top: line, borderTopWidth: 2, borderStyle: 'dashed', borderColor: C.ink }} />
                <View style={{ flexDirection: 'row' }}>
                  {w.days.map((d, i) => <Col key={d.day} i={i} h={pct(d.spent)} ok={d.under} today={i === 6} label={'MTWTFSS'[(parseDay(d.day).getDay() + 6) % 7]} />)}
                </View>
              </View>
            </GreenPanel>
          </View>
        </DarkCard>
      </Rise>
      <Rise i={2} style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
        <Card style={{ flex: 1, padding: 16, borderRadius: 24 }}><Text style={TYPE.small}>Rolled over</Text><Odometer value={w.rolled} size={22} /><Text style={[TYPE.small, { marginTop: 2 }]}>unspent this week</Text></Card>
        <Card style={{ flex: 1, padding: 16, borderRadius: 24 }}><Text style={TYPE.small}>Spent</Text><Odometer value={w.days.reduce((s, d) => s + d.spent, 0)} size={22} /><Text style={[TYPE.small, { marginTop: 2 }]}>last 7 days</Text></Card>
      </Rise>
      {w.rolled >= 30 && (
        <Rise i={3}>
          <Press onPress={() => r.push({ pathname: '/move', params: { to: jars.find((j) => j.key === 'savings')?.id } })} label="Move to savings">
            <Card style={{ marginTop: 12, padding: 14, borderRadius: 24, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 42, height: 42, borderRadius: 15, backgroundColor: C.softGreen, alignItems: 'center', justifyContent: 'center' }}><Icon name="jar" size={20} color={C.deepGreen} /></View>
              <View style={{ flex: 1 }}><Text style={TYPE.h3}>Move {moneyShort(Math.floor(w.rolled / 10) * 10)} to Savings?</Text><Text style={TYPE.small}>You have room this week. Future you says thanks.</Text></View>
              <Icon name="chevron" color={C.faint} />
            </Card>
          </Press>
        </Rise>
      )}
      <SectionTitle title="Where it goes" />
      {pro ? proContent : <Locked onUnlock={() => r.push({ pathname: '/paywall', params: { from: 'insights' } })}>{proContent}</Locked>}
    </Screen>
  );
}
