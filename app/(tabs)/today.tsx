import { useEffect, useMemo, useState } from 'react';
import { RefreshControl, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Extrapolation, FadeInDown, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withDelay, withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '@/components/Header';
import { Card, DarkCard, GreenPanel, IconBtn, Pill, Press, Rise, SectionTitle, T } from '@/components/ui';
import { Ring } from '@/components/Ring';
import { Icon } from '@/components/Icon';
import { TxRow } from '@/components/TxRow';
import { TxSheet } from '@/components/TxSheet';
import { BackupNudge } from '@/components/BackupNudge';
import { HomeSkeleton } from '@/components/Skeleton';
import { IlloCalendar, IlloEmpty, Floaty } from '@/components/Illustrations';
import { useStore } from '@/lib/store';
import { useDraft } from '@/lib/draft';
import { daysBetween, fmtDay, fmtRelative, money, moneyShort, round2, snapshot, todayStr, weekReview } from '@/lib/money';
import { C, F, TYPE, shadow } from '@/lib/theme';
import type { Tx } from '@/lib/types';

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };
const QUICK = [{ label: 'Coffee', q: 'coffee 4' }, { label: 'Lunch', q: 'lunch 10' }, { label: 'Ride', q: 'uber 12' }, { label: 'Groceries', q: 'groceries 30' }];

export default function Today() {
  const r = useRouter(); const ins = useSafeAreaInsets();
  const { cycle, jars, txs, moves, bills, incomes, profile, email, loaded, load, deleteTx } = useStore();
  const prefill = useDraft((s) => s.prefillFrom);
  const [edit, setEdit] = useState<Tx | null>(null); const [sheet, setSheet] = useState(false); const [refreshing, setRefreshing] = useState(false);
  const snap = useMemo(() => (cycle ? snapshot(cycle, jars, txs, moves, bills, incomes) : null), [cycle, jars, txs, moves, bills, incomes]);
  const week = useMemo(() => (cycle ? weekReview(cycle, jars, txs) : null), [cycle, jars, txs]);

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => { scrollY.value = e.contentOffset.y; });
  const heroParallax = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(scrollY.value, [-100, 0, 300], [-30, 0, 70], Extrapolation.CLAMP) },
      { scale: interpolate(scrollY.value, [-120, 0, 300], [1.06, 1, 0.9], Extrapolation.CLAMP) },
    ],
    opacity: interpolate(scrollY.value, [0, 280], [1, 0.4], Extrapolation.CLAMP),
  }));
  const compact = useAnimatedStyle(() => ({ opacity: interpolate(scrollY.value, [250, 320], [0, 1], Extrapolation.CLAMP), transform: [{ translateY: interpolate(scrollY.value, [250, 320], [-20, 0], Extrapolation.CLAMP) }] }));

  const total = cycle ? Math.max(1, daysBetween(cycle.start_date, cycle.payday)) : 1;
  const elapsed = cycle ? Math.min(1, Math.max(0, daysBetween(cycle.start_date, todayStr()) / total)) : 0;
  const fill = useSharedValue(0);
  useEffect(() => { fill.value = withDelay(500, withSpring(elapsed, { damping: 16, stiffness: 60 })); }, [elapsed]);
  const bar = useAnimatedStyle(() => ({ width: `${Math.max(3, fill.value * 100)}%` as any }));

  if (!loaded || !cycle || !snap || !week) return <View style={{ flex: 1, padding: 18, paddingTop: ins.top + 8, backgroundColor: C.bg }}><HomeSkeleton /></View>;

  const today = txs.filter((t) => t.occurred_on === todayStr());
  const upcoming = bills.filter((b) => !b.paid && b.due_date <= cycle.payday).slice(0, 3);
  const paydayHere = daysBetween(todayStr(), cycle.payday) <= 0;
  const over = snap.leftToday < 0;
  const status = over ? 'Over today' : snap.leftToday < snap.allowance * 0.25 ? 'Nearly there' : 'On pace';
  const tomorrow = round2(Math.max(0, snap.spendable) / Math.max(1, snap.daysLeft - 1));
  const name = profile.name || email.split('@')[0] || 'there';

  const startNewCycle = () => { prefill(cycle.income, bills, cycle.payday); r.push('/onboarding/payday'); };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <LinearGradient colors={['#F8F9F8', '#EEF0EE']} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={C.green2} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
        contentContainerStyle={{ paddingTop: ins.top + 8, paddingHorizontal: 18, paddingBottom: 130 }}>
        <Rise><Header kicker={new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' })} title={`${greeting()}, ${name}`}
          right={<IconBtn name="search" label="Search history" onPress={() => r.push('/activity')} />} /></Rise>

        {paydayHere && (
          <Rise i={1}>
            <Press onPress={startNewCycle} label="Start your next plan">
              <Card style={{ marginTop: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.softGold }}>
                <IlloCalendar size={70} />
                <View style={{ flex: 1 }}><Text style={TYPE.h3}>It's payday</Text><Text style={TYPE.small}>Start your next plan in 30 seconds. Recurring bills are already in.</Text></View>
                <Icon name="chevron" />
              </Card>
            </Press>
          </Rise>
        )}

        <Animated.View style={heroParallax}>
          <Rise i={1}>
            <DarkCard style={{ marginTop: 14, height: 420 }}>
              <View style={{ padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View>
                  <Text style={{ fontFamily: F.r, color: '#C3CAC3', fontSize: 13 }}>Today's allowance</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}><Pill tone={over ? 'danger' : 'green'}>{status}</Pill><Pill>{snap.daysLeft} days to payday</Pill></View>
                </View>
                {week.streak > 1 && (
                  <View style={{ alignItems: 'center', backgroundColor: 'rgba(255,200,30,.14)', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6 }}>
                    <Icon name="flame" size={18} color={C.gold} />
                    <Text style={{ fontFamily: F.x, fontSize: 12, color: C.gold }}>{week.streak}d</Text>
                  </View>
                )}
              </View>
              <View style={{ position: 'absolute', top: 70, left: 0, right: 0, alignItems: 'center' }}>
                <Ring left={snap.leftToday} total={snap.allowance} sub={`of ${money(snap.allowance)}`} size={214} />
              </View>
              <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
                <GreenPanel style={{ height: 124, paddingHorizontal: 18 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontFamily: F.x, fontSize: 14 }}>Runway to payday</Text>
                    <Text style={{ fontFamily: F.b, fontSize: 12 }}>{moneyShort(snap.spendable)} spendable</Text>
                  </View>
                  <View style={{ marginTop: 22, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,.4)' }}>
                    <Animated.View style={[{ height: 10, borderRadius: 5, backgroundColor: C.ink }, bar]} />
                    {upcoming.map((b, i) => {
                      const f = Math.min(0.92, Math.max(0.06, daysBetween(cycle.start_date, b.due_date) / total));
                      return (
                        <Animated.View key={b.id} entering={FadeInDown.delay(700 + i * 100).springify()} style={{ position: 'absolute', left: `${f * 100}%`, top: -5, marginLeft: -10, width: 20, height: 20, borderRadius: 10, backgroundColor: C.ink, borderWidth: 2, borderColor: '#7BE07F', alignItems: 'center', justifyContent: 'center' }}>
                          <Icon name="lock" size={9} color="#fff" sw={3} />
                        </Animated.View>
                      );
                    })}
                    <View style={{ position: 'absolute', right: -6, top: -7, width: 24, height: 24, borderRadius: 12, backgroundColor: C.yellow, borderWidth: 2.5, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' }}><Icon name="coin" size={13} sw={2.4} /></View>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 }}>
                    <Text style={{ fontFamily: F.b, fontSize: 10 }}>Today</Text>
                    <Text style={{ fontFamily: F.b, fontSize: 10 }}>{upcoming.length ? `${upcoming.length} bills locked` : 'All bills paid'}</Text>
                    <Text style={{ fontFamily: F.b, fontSize: 10 }}>Payday {fmtDay(cycle.payday)}</Text>
                  </View>
                </GreenPanel>
              </View>
            </DarkCard>
          </Rise>
        </Animated.View>

        <Rise i={2}>
          <Press onPress={() => r.push('/(tabs)/chat')} label="Log spending" scale={0.98} style={[{ marginTop: 12, height: 58, borderRadius: 29, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', paddingLeft: 18, paddingRight: 9, gap: 10 }, shadow.soft]}>
            <Text style={{ flex: 1, fontFamily: F.r, color: C.muted, fontSize: 15 }}>Tell Kwik: <Text style={{ fontFamily: F.b, color: C.ink }}>lunch 8</Text></Text>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' }}><Icon name="arrow" color={C.green} size={18} sw={2.4} /></View>
          </Press>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            {QUICK.map((q) => (
              <Press key={q.label} onPress={() => r.push({ pathname: '/(tabs)/chat', params: { q: q.q } })} label={`Log ${q.label}`} style={{ flex: 1 }}>
                <View style={{ height: 36, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: F.b, fontSize: 12 }}>{q.label}</Text></View>
              </Press>
            ))}
          </View>
        </Rise>

        <Rise i={3} style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          <Card style={{ flex: 1, padding: 14, borderRadius: 24 }}>
            <Text style={TYPE.small}>Tomorrow, if you stop now</Text>
            <Text style={{ fontFamily: F.x, fontSize: 20, marginTop: 4, color: C.deepGreen }}>{money(tomorrow)}</Text>
          </Card>
          <Card style={{ flex: 1, padding: 14, borderRadius: 24 }}>
            <Text style={TYPE.small}>Spent today</Text>
            <Text style={{ fontFamily: F.x, fontSize: 20, marginTop: 4 }}>{money(snap.spentToday)}</Text>
          </Card>
        </Rise>

        <BackupNudge />

        {upcoming.length > 0 && (
          <>
            <SectionTitle title="Coming up" action="All bills" onAction={() => r.push('/(tabs)/bills')} />
            <Card style={{ paddingHorizontal: 16 }}>
              {upcoming.map((b, i) => (
                <View key={b.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, height: 58, borderTopWidth: i ? 1 : 0, borderColor: C.line }}>
                  <View style={{ width: 42, height: 42, borderRadius: 15, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' }}><Icon name="lock" size={18} color={C.green} /></View>
                  <View style={{ flex: 1 }}><Text style={{ fontFamily: F.b, fontSize: 15 }}>{b.name}</Text><Text style={TYPE.small}>{fmtRelative(b.due_date)} · already set aside</Text></View>
                  <Text style={{ fontFamily: F.x, fontSize: 15 }}>{moneyShort(b.amount)}</Text>
                </View>
              ))}
            </Card>
          </>
        )}

        <SectionTitle title="Today" action="History" onAction={() => r.push('/activity')} />
        <Card style={{ paddingHorizontal: 16, overflow: 'hidden' }}>
          {today.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 18 }}>
              <Floaty><IlloEmpty size={120} /></Floaty>
              <Text style={[TYPE.h3, { marginTop: 4 }]}>Nothing spent yet</Text>
              <T style={{ color: C.muted, textAlign: 'center', marginTop: 4 }}>Your full {money(snap.allowance)} is safe to spend today.</T>
            </View>
          ) : today.map((t, i) => (
            <TxRow key={t.id} tx={t} first={i === 0} jar={jars.find((j) => j.id === t.jar_id)} onPress={() => { setEdit(t); setSheet(true); }} onDelete={() => deleteTx(t.id)} />
          ))}
        </Card>
        {today.length > 0 && <Text style={[TYPE.small, { textAlign: 'center', marginTop: 10 }]}>Swipe left to delete, tap to edit</Text>}
      </Animated.ScrollView>

      {/* Compact sticky summary that slides in once the hero scrolls away */}
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: ins.top + 6, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.ink2, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 }, shadow.dark, compact]}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: over ? C.danger : C.green }} />
        <Text style={{ fontFamily: F.x, fontSize: 13, color: '#fff' }}>{money(snap.leftToday)} left today</Text>
      </Animated.View>
      <TxSheet visible={sheet} tx={edit} onClose={() => setSheet(false)} />
    </View>
  );
}
