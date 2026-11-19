import { useEffect, useMemo, useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeInDown, FadeInRight, FadeOut, LinearTransition, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring } from 'react-native-reanimated';
import { Screen } from '@/components/Screen';
import { Header } from '@/components/Header';
import { Card, Chip, Cta, DarkCard, Ghost, IconBtn, Pill, Press, Rise, SectionTitle, T } from '@/components/ui';
import { Odometer } from '@/components/Odometer';
import { Icon } from '@/components/Icon';
import { Sheet } from '@/components/Sheet';
import { Segmented } from '@/components/Segmented';
import { IlloCalendar, Floaty } from '@/components/Illustrations';
import { useStore } from '@/lib/store';
import { requirePro } from '@/lib/afterLog';
import { addDays, currencySymbol, daysBetween, fmtDay, fmtLong, fmtRelative, money, moneyShort, snapshot, todayStr } from '@/lib/money';
import { Candidate, billingLabel, detectCandidates, monthlyCost, priceChanges, trialEndsIn, yearlyCost } from '@/lib/subscriptions';
import { merchantKey } from '@/lib/parser';
import { C, F, TYPE } from '@/lib/theme';
import { success, thud, warn } from '@/lib/fx';
import type { Bill, BillKind, Billing } from '@/lib/types';

const DISMISS_KEY = 'kp.subDismissed';
const TINTS = ['#E9E6FF', '#FFE3EC', '#DFF1FF', '#FFF1BF', '#DDF7C8'];
const tint = (s: string) => TINTS[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % TINTS.length];

function Check({ on, onPress, label }: { on: boolean; onPress: () => void; label: string }) {
  const s = useSharedValue(on ? 1 : 0);
  useEffect(() => { s.value = on ? withSequence(withSpring(1.25, { damping: 6, stiffness: 320 }), withSpring(1)) : withSpring(0); }, [on]);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Press onPress={onPress} label={label} haptic={false} style={{ width: 30, height: 30, borderRadius: 15, borderWidth: 2.5, borderColor: on ? C.green2 : '#C9CEC9', alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ width: 30, height: 30, borderRadius: 15, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' }, a]}><Icon name="check" size={16} sw={3} /></Animated.View>
    </Press>
  );
}

function Progress({ f }: { f: number }) {
  const w = useSharedValue(0);
  useEffect(() => { w.value = withDelay(300, withSpring(f, { damping: 16, stiffness: 70 })); }, [f]);
  const a = useAnimatedStyle(() => ({ width: `${w.value * 100}%` as any }));
  return <View style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,.12)', marginTop: 14, overflow: 'hidden' }}><Animated.View style={[{ height: 8, borderRadius: 4, backgroundColor: C.green }, a]} /></View>;
}

export default function Bills() {
  const r = useRouter();
  const { cycle, jars, txs, moves, bills, incomes, pro, setBillPaid, addBill, updateBill, deleteBill } = useStore();
  const [sheet, setSheet] = useState<null | { mode: 'add'; kind: BillKind; name?: string; amount?: number; billing?: Billing } | { mode: 'edit'; bill: Bill }>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);
  useEffect(() => { AsyncStorage.getItem(DISMISS_KEY).then((v) => v && setDismissed(JSON.parse(v))).catch(() => {}); }, []);
  const snap = useMemo(() => (cycle ? snapshot(cycle, jars, txs, moves, bills, incomes) : null), [cycle, jars, txs, moves, bills, incomes]);
  const candidates = useMemo(() => detectCandidates(txs, bills, dismissed), [txs, bills, dismissed]);
  const rises = useMemo(() => priceChanges(bills, txs), [bills, txs]);
  if (!cycle || !snap) return null;

  const subs = bills.filter((b) => b.kind === 'subscription');
  const plain = bills.filter((b) => b.kind !== 'subscription');
  const unpaid = plain.filter((b) => !b.paid); const paid = plain.filter((b) => b.paid);
  const inCycle = bills.filter((b) => b.due_date <= cycle.payday);
  const total = inCycle.reduce((s, b) => s + b.amount, 0); const paidTotal = inCycle.filter((b) => b.paid).reduce((s, b) => s + b.amount, 0);
  const perMonth = subs.reduce((s, b) => s + monthlyCost(b), 0); const perYear = subs.reduce((s, b) => s + yearlyCost(b), 0);

  const toggle = (b: Bill) => { thud(); setBillPaid(b.id, !b.paid).then((ok) => { if (ok && !b.paid) success(); }); };
  const remove = (b: Bill) => Alert.alert(`Remove ${b.name}?`, b.kind === 'subscription' ? 'It will stop being tracked. Remember to cancel it with the provider too.' : 'It will be removed from this cycle.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => { deleteBill(b.id); setSheet(null); } }]);
  const dismiss = (c: Candidate) => { const next = [...dismissed, c.key]; setDismissed(next); AsyncStorage.setItem(DISMISS_KEY, JSON.stringify(next)).catch(() => {}); };

  const BillRow = ({ b, i }: { b: Bill; i: number }) => {
    const soon = !b.paid && daysBetween(todayStr(), b.due_date) <= 2;
    return (
      <Animated.View layout={LinearTransition.springify().damping(17)} entering={FadeInRight.delay(i * 60).springify()}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, borderTopWidth: i ? 1 : 0, borderColor: C.line }}>
        <Check on={b.paid} onPress={() => toggle(b)} label={b.paid ? `Mark ${b.name} unpaid` : `Mark ${b.name} paid`} />
        <Press onLongPress={() => remove(b)} onPress={() => toggle(b)} haptic={false} style={{ flex: 1 }} label={b.name} scale={0.99}>
          <Text style={{ fontFamily: F.b, fontSize: 15, color: b.paid ? C.faint : C.ink, textDecorationLine: b.paid ? 'line-through' : 'none' }}>{b.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <Text style={[TYPE.small, soon && { color: C.danger, fontFamily: F.b }]}>{b.paid ? 'Paid' : `${fmtRelative(b.due_date)} · ${fmtDay(b.due_date)}`}</Text>
            {b.recurring && <Icon name="repeat" size={11} color={C.faint} />}
          </View>
        </Press>
        <Text style={{ fontFamily: F.x, fontSize: 15, color: b.paid ? C.faint : C.ink }}>{moneyShort(b.amount)}</Text>
      </Animated.View>
    );
  };

  const SubRow = ({ b, i }: { b: Bill; i: number }) => {
    const trial = trialEndsIn(b); const rise = rises.find((x) => x.bill.id === b.id);
    return (
      <Animated.View layout={LinearTransition.springify()} entering={FadeInRight.delay(i * 60).springify()}>
        <Press onPress={() => setSheet({ mode: 'edit', bill: b })} label={b.name} scale={0.99}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 66, borderTopWidth: i ? 1 : 0, borderColor: C.line, paddingVertical: 8 }}>
            <View style={{ width: 42, height: 42, borderRadius: 15, backgroundColor: tint(b.name), alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: F.x, fontSize: 17 }}>{b.name[0]?.toUpperCase()}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.b, fontSize: 15 }}>{b.name}</Text>
              <Text style={TYPE.small}>Renews {fmtRelative(b.due_date).toLowerCase() === 'today' ? 'today' : fmtLong(b.due_date)} · {billingLabel[b.billing]}ly</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                {trial != null && trial >= 0 && <Pill tone="gold">{trial === 0 ? 'Trial ends today' : `Trial ends in ${trial}d`}</Pill>}
                {rise && (pro ? <Pill tone="danger">{`Up from ${money(rise.from)}`}</Pill> : <Pill tone="gold">Price alert · Pro</Pill>)}
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontFamily: F.x, fontSize: 15 }}>{money(b.amount)}</Text>
              <Text style={TYPE.small}>{moneyShort(yearlyCost(b))}/yr</Text>
            </View>
          </View>
        </Press>
      </Animated.View>
    );
  };

  return (
    <Screen bottom={130}>
      <Rise><Header kicker={`Until payday · ${fmtDay(cycle.payday)}`} title="Bills & subscriptions" right={<IconBtn name="plus" label="Add" onPress={() => setSheet({ mode: 'add', kind: 'bill' })} />} /></Rise>
      <Rise i={1}>
        <DarkCard style={{ marginTop: 14, padding: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.r, color: '#C3CAC3', fontSize: 13 }}>Still due before payday</Text>
              <Odometer value={snap.billsDue} size={34} color="#fff" centsColor="#9AA29A" />
              <Text style={{ fontFamily: F.b, color: C.lime, fontSize: 12, marginTop: 4 }}>Already set aside. Safe from spending.</Text>
            </View>
            <Floaty><IlloCalendar size={96} /></Floaty>
          </View>
          <Progress f={total ? paidTotal / total : 0} />
          <Text style={{ fontFamily: F.s, color: '#9AA29A', fontSize: 12, marginTop: 8 }}>{inCycle.filter((b) => b.paid).length} of {inCycle.length} paid · {moneyShort(paidTotal)} of {moneyShort(total)}</Text>
        </DarkCard>
      </Rise>

      {/* ---------- Subscriptions ---------- */}
      <SectionTitle title="Subscriptions" action="Add" onAction={() => setSheet({ mode: 'add', kind: 'subscription' })} />
      {subs.length > 0 && (
        <Rise i={2}>
          <Card style={{ padding: 16, marginBottom: 10, flexDirection: 'row' }}>
            <View style={{ flex: 1 }}><Text style={TYPE.small}>Every month</Text><Text style={{ fontFamily: F.x, fontSize: 22 }}>{money(perMonth)}</Text></View>
            <View style={{ width: 1, backgroundColor: C.line, marginHorizontal: 12 }} />
            <View style={{ flex: 1 }}><Text style={TYPE.small}>Every year</Text><Text style={{ fontFamily: F.x, fontSize: 22, color: C.danger }}>{moneyShort(perYear)}</Text></View>
          </Card>
        </Rise>
      )}
      {subs.length > 0 ? <Card style={{ paddingHorizontal: 16 }}>{subs.map((b, i) => <SubRow key={b.id} b={b} i={i} />)}</Card> : (
        <Card style={{ padding: 18, alignItems: 'center' }}>
          <Icon name="repeat" color={C.muted} />
          <T style={{ color: C.muted, textAlign: 'center', marginTop: 6, lineHeight: 20 }}>Track Netflix, Spotify, gym and apps here. Kwik also spots them from what you log.</T>
        </Card>
      )}
      {candidates.length > 0 && (
        <Animated.View entering={FadeInDown.springify()}>
          <Text style={[TYPE.caption, { marginTop: 14, marginBottom: 8, paddingHorizontal: 4 }]}>Looks like a subscription</Text>
          <Card style={{ paddingHorizontal: 16 }}>
            {candidates.slice(0, 4).map((c, i) => (
              <Animated.View key={c.key} exiting={FadeOut} layout={LinearTransition} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 60, borderTopWidth: i ? 1 : 0, borderColor: C.line }}>
                <Icon name="sparkles" size={18} color={C.deepGreen} />
                <View style={{ flex: 1 }}><Text style={{ fontFamily: F.b, fontSize: 15 }}>{c.merchant}</Text><Text style={TYPE.small}>{money(c.amount)} · {c.reason === 'repeat' ? `paid every ${billingLabel[c.billing]}` : 'logged as a subscription'}</Text></View>
                <Press onPress={() => dismiss(c)} label="Not a subscription" style={{ padding: 6 }}><Icon name="close" size={16} color={C.muted} /></Press>
                <Press onPress={() => setSheet({ mode: 'add', kind: 'subscription', name: c.merchant, amount: c.amount, billing: c.billing })} label={`Track ${c.merchant}`}>
                  <View style={{ height: 34, paddingHorizontal: 14, borderRadius: 17, backgroundColor: C.ink, justifyContent: 'center' }}><Text style={{ fontFamily: F.x, fontSize: 12, color: '#fff' }}>Track</Text></View>
                </Press>
              </Animated.View>
            ))}
          </Card>
        </Animated.View>
      )}
      {!pro && subs.length > 0 && (
        <Press onPress={() => r.push({ pathname: '/paywall', params: { from: 'subscriptions' } })} label="Subscription alerts">
          <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 18, backgroundColor: C.softGold }}>
            <Icon name="bell" size={16} color={C.warnInk} />
            <Text style={{ flex: 1, fontFamily: F.s, fontSize: 13, color: C.warnInk }}>Get alerts before renewals, trial ends and price rises with Pro.</Text>
            <Icon name="chevron" size={16} color={C.warnInk} />
          </View>
        </Press>
      )}

      {/* ---------- Bills ---------- */}
      <SectionTitle title="Bills" action="Add" onAction={() => setSheet({ mode: 'add', kind: 'bill' })} />
      <Card style={{ paddingHorizontal: 16 }}>
        {unpaid.length === 0 ? <View style={{ paddingVertical: 20, alignItems: 'center' }}><Icon name="sparkles" color={C.deepGreen} /><T style={{ color: C.muted, marginTop: 6 }}>Every bill is paid. Enjoy that feeling.</T></View>
          : unpaid.map((b, i) => <BillRow key={b.id} b={b} i={i} />)}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, height: 56, borderTopWidth: 1, borderColor: C.line }}>
          <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' }}><Icon name="coin" size={16} sw={2.4} /></View>
          <Text style={{ flex: 1, fontFamily: F.x, fontSize: 15 }}>Payday · {fmtDay(cycle.payday)}</Text>
          <Text style={{ fontFamily: F.x, fontSize: 15, color: C.deepGreen }}>+{moneyShort(cycle.income)}</Text>
        </View>
      </Card>
      {paid.length > 0 && (<><SectionTitle title="Paid this cycle" /><Card style={{ paddingHorizontal: 16 }}>{paid.map((b, i) => <BillRow key={b.id} b={b} i={i} />)}</Card></>)}
      <Text style={[TYPE.small, { textAlign: 'center', marginTop: 12 }]}>Tap a bill to mark it paid · long-press to remove</Text>

      <BillSheet state={sheet} payday={cycle.payday} daysLeft={snap.daysLeft} onClose={() => setSheet(null)} pro={pro}
        onPaywall={() => { setSheet(null); requirePro(r, 'subscriptions'); }}
        onCreate={async (v) => { const ok = await addBill(v.name, v.amount, v.due, { kind: v.kind, billing: v.billing, trial_ends: v.trial }); if (ok) { success(); setSheet(null); } }}
        onUpdate={async (b, v) => { const ok = await updateBill(b.id, { name: v.name, amount: v.amount, billing: v.billing, trial_ends: v.trial, due_date: v.due, prev_amount: v.amount !== b.amount ? b.amount : b.prev_amount }); if (ok) { success(); setSheet(null); } }}
        onRemove={remove} />
    </Screen>
  );
}

type Draft = { name: string; amount: number; due: string; kind: BillKind; billing: Billing; trial: string | null };

function BillSheet({ state, payday, daysLeft, onClose, onCreate, onUpdate, onRemove, pro, onPaywall }: {
  state: null | { mode: 'add'; kind: BillKind; name?: string; amount?: number; billing?: Billing } | { mode: 'edit'; bill: Bill };
  payday: string; daysLeft: number; pro: boolean; onClose: () => void; onPaywall: () => void;
  onCreate: (v: Draft) => void; onUpdate: (b: Bill, v: Draft) => void; onRemove: (b: Bill) => void;
}) {
  const edit = state?.mode === 'edit' ? state.bill : null;
  const [kind, setKind] = useState<BillKind>('bill'); const [name, setName] = useState(''); const [amt, setAmt] = useState('');
  const [billing, setBilling] = useState<Billing>('monthly'); const [due, setDue] = useState(addDays(todayStr(), 3)); const [trial, setTrial] = useState<number | null>(null);
  useEffect(() => {
    if (!state) return;
    if (state.mode === 'edit') { const b = state.bill; setKind(b.kind); setName(b.name); setAmt(String(b.amount)); setBilling(b.billing); setDue(b.due_date); setTrial(b.trial_ends ? Math.max(0, daysBetween(todayStr(), b.trial_ends)) : null); }
    else { setKind(state.kind); setName(state.name ?? ''); setAmt(state.amount ? String(state.amount) : ''); setBilling(state.billing ?? 'monthly'); setDue(addDays(todayStr(), state.kind === 'subscription' ? 7 : 3)); setTrial(null); }
  }, [state]);
  const dueOptions = kind === 'subscription' ? [1, 7, 14, 30] : [1, 3, 7, 14].filter((d) => d <= daysLeft);
  const save = () => {
    const n = Number(amt.replace(',', '.'));
    if (!name.trim() || !(n > 0)) return warn();
    const v: Draft = { name: name.trim(), amount: n, due, kind, billing, trial: trial != null ? addDays(todayStr(), trial) : null };
    edit ? onUpdate(edit, v) : onCreate(v);
  };
  return (
    <Sheet visible={!!state} onClose={onClose} title={edit ? `Edit ${edit.name}` : kind === 'subscription' ? 'Track a subscription' : 'Add a bill'}>
      {!edit && <View style={{ marginTop: 6 }}><Segmented<BillKind> value={kind} onChange={setKind} options={[{ key: 'bill', label: 'Bill' }, { key: 'subscription', label: 'Subscription' }]} /></View>}
      <TextInput value={name} onChangeText={setName} placeholder={kind === 'subscription' ? 'Name (e.g. Netflix)' : 'Name (e.g. Water)'} placeholderTextColor={C.faint}
        style={{ marginTop: 12, height: 54, borderRadius: 18, backgroundColor: C.chip, paddingHorizontal: 16, fontFamily: F.b, fontSize: 16, color: C.ink }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, height: 54, borderRadius: 18, backgroundColor: C.chip, paddingHorizontal: 16 }}>
        <Text style={{ fontFamily: F.x, fontSize: 16, color: C.muted }}>{currencySymbol()}</Text>
        <TextInput value={amt} onChangeText={(t) => setAmt(t.replace(/[^0-9.,]/g, ''))} keyboardType="decimal-pad" placeholder="Amount" placeholderTextColor={C.faint} style={{ flex: 1, fontFamily: F.x, fontSize: 16, color: C.ink, marginLeft: 6 }} />
        {kind === 'subscription' && <Text style={{ fontFamily: F.s, color: C.muted }}>per {billingLabel[billing]}</Text>}
      </View>
      {kind === 'subscription' && (
        <>
          <Text style={[TYPE.caption, { marginTop: 14, marginBottom: 8 }]}>Billed</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>{(['weekly', 'monthly', 'yearly'] as Billing[]).map((b) => <Chip key={b} label={b[0].toUpperCase() + b.slice(1)} on={billing === b} onPress={() => setBilling(b)} />)}</View>
          <Text style={[TYPE.caption, { marginTop: 14, marginBottom: 8 }]}>Free trial</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {[null, 3, 7, 14, 30].map((d) => <Chip key={String(d)} label={d == null ? 'No trial' : `Ends in ${d}d`} on={trial === d} onPress={() => setTrial(d)} />)}
          </View>
          {trial != null && !pro && (
            <Press onPress={onPaywall} label="Trial reminders"><Text style={{ fontFamily: F.s, fontSize: 12, color: C.warnInk, marginTop: 8 }}>Want a reminder before it charges you? That's a Pro alert. Tap to see Pro.</Text></Press>
          )}
        </>
      )}
      <Text style={[TYPE.caption, { marginTop: 14, marginBottom: 8 }]}>{kind === 'subscription' ? 'Next charge' : 'Due'}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {dueOptions.map((d) => { const v = addDays(todayStr(), d); return <Chip key={d} label={d <= 6 ? fmtRelative(v) : fmtLong(v)} on={due === v} onPress={() => setDue(v)} />; })}
      </View>
      <Text style={[TYPE.small, { marginTop: 12 }]}>
        {due <= payday ? 'Due before payday, so the amount moves from your Buffer into Bills to keep your plan balanced.' : 'Due after payday, so it carries into your next plan automatically.'}
      </Text>
      <View style={{ marginTop: 14 }}><Cta title={edit ? 'Save changes' : kind === 'subscription' ? 'Track subscription' : 'Add bill'} onPress={save} /></View>
      {edit && <Ghost title={edit.kind === 'subscription' ? 'Stop tracking' : 'Remove bill'} color={C.danger} onPress={() => onRemove(edit)} />}
    </Sheet>
  );
}
