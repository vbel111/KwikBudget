import { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import type { ScrollViewInstance } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, {
  Easing, FadeIn, FadeInDown, FadeInUp, LinearTransition, ZoomIn, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Header } from '@/components/Header';
import { CatTile, IconBtn, Press, T } from '@/components/ui';
import { Icon, IconName } from '@/components/Icon';
import { Burst } from '@/components/Burst';
import { TxSheet } from '@/components/TxSheet';
import { IlloChat } from '@/components/Illustrations';
import { useStore } from '@/lib/store';
import { Parsed, Spend, merchantKey, parseEntries } from '@/lib/parser';
import { catByKey } from '@/lib/categories';
import { aiParse, AiEntry } from '@/lib/ai';
import { scanReceipt, Prefill } from '@/lib/scan';
import { addDays, money, snapshot, todayStr } from '@/lib/money';
import { afterLog } from '@/lib/afterLog';
import { C, F, TYPE, shadow } from '@/lib/theme';
import { success, thud, warn } from '@/lib/fx';

type SpendMsg = { id: number; role: 'spend'; amount: number; merchant: string; category: string; jarId: string | null; saved: boolean; picking?: boolean; daysAgo: number; note: string | null; source: Spend['source'] };
type Msg =
  | { id: number; role: 'me'; text: string }
  | { id: number; role: 'kwik'; text: string; tone?: 'ok' | 'pro'; action?: { label: string; go: 'paywall' | 'import' } }
  | { id: number; role: 'typing'; ai?: boolean }
  | SpendMsg;

const SUGGEST = ['coffee 4, bus 2.50', 'lunch 8.50 mamas', 'uber 14 yesterday', 'dinner 60 my share 20', 'got 50 tips'];
let uid = 1;
let limitNoticeShown = false;

function Dot({ i }: { i: number }) {
  const y = useSharedValue(0);
  useEffect(() => { y.value = withDelay(i * 120, withRepeat(withSequence(withTiming(-4, { duration: 260, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 260 })), -1)); }, []);
  const a = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return <Animated.View style={[{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.faint }, a]} />;
}

const dayLabel = (n: number) => (n === 0 ? '' : n === 1 ? 'Yesterday' : `${n} days ago`);

export default function Chat() {
  const ins = useSafeAreaInsets(); const router = useRouter();
  const { q } = useLocalSearchParams<{ q?: string }>();
  const { cycle, jars, txs, moves, bills, incomes, memory, addTx, setBillPaid, addIncome, learn, showToast } = useStore();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState(''); const [burst, setBurst] = useState(0);
  const [manual, setManual] = useState(false); const [prefill, setPrefill] = useState<Prefill | null>(null); const [scanning, setScanning] = useState(false);
  const ref = useRef<ScrollViewInstance>(null); const lastQ = useRef<string | undefined>(undefined);
  const snap = useMemo(() => (cycle ? snapshot(cycle, jars, txs, moves, bills, incomes) : null), [cycle, jars, txs, moves, bills, incomes]);
  const open = jars.filter((j) => !j.locked);
  const buffer = jars.find((j) => j.key === 'buffer');

  const scrollEnd = () => setTimeout(() => ref.current?.scrollToEnd({ animated: true }), 60);
  const push = (...m: Msg[]) => { setMsgs((x) => [...x.filter((y) => y.role !== 'typing'), ...m]); scrollEnd(); };
  const typing = (ai = false) => { setMsgs((x) => [...x.filter((y) => y.role !== 'typing'), { id: uid++, role: 'typing', ai }]); scrollEnd(); };
  const patch = (id: number, p: Partial<SpendMsg>) => setMsgs((x) => x.map((m) => (m.id === id && m.role === 'spend' ? { ...m, ...p } : m)));

  const fromAi = (e: AiEntry): Parsed => {
    if (e.kind === 'spend' && e.amount && e.amount > 0) {
      const cat = catByKey(e.category); const mem = memory[merchantKey(e.merchant ?? '')];
      return { kind: 'spend', amount: e.amount, merchant: e.merchant || cat.label, category: (mem?.category as any) ?? cat.key, jarKey: mem?.jar_key ?? cat.jar, daysAgo: e.days_ago ?? 0, note: e.note ?? null, confident: true, source: 'ai' };
    }
    if (e.kind === 'income' && e.amount) return { kind: 'income', amount: e.amount, note: e.note || e.merchant || 'Extra income', daysAgo: e.days_ago ?? 0 };
    if (e.kind === 'bill_paid') { const b = bills.find((x) => !x.paid && x.name.toLowerCase() === (e.bill_name ?? '').toLowerCase()); if (b) return { kind: 'billPaid', bill: b }; }
    return { kind: 'unknown', text: '' };
  };

  const send = async (raw: string) => {
    const v = raw.trim(); if (!v) return; setText('');
    push({ id: uid++, role: 'me', text: v });
    let items = parseEntries(v, bills, memory);
    const unsure = items.some((p) => p.kind === 'unknown' || (p.kind === 'spend' && !p.confident));
    if (unsure) {
      typing(true);
      const r = await aiParse(v, bills.filter((b) => !b.paid).map((b) => b.name));
      if (r.ok && r.data.entries?.length) {
        const mapped = r.data.entries.map(fromAi).filter((p) => p.kind !== 'unknown');
        if (mapped.length) items = mapped;
      } else if (!r.ok && r.reason === 'limit' && !limitNoticeShown) {
        limitNoticeShown = true;
        push({ id: uid++, role: 'kwik', tone: 'pro', text: "That was a tricky one. You've used today's free Kwik AI help, so I've made my best guess below.", action: { label: 'Unlimited with Pro', go: 'paywall' } });
      } else if (!r.ok && r.reason === 'setup' && __DEV__) {
        showToast(r.message ?? 'Kwik AI is not set up', { tone: 'error' });
      }
    } else typing(false);
    await new Promise((res) => setTimeout(res, unsure ? 0 : 320));

    const out: Msg[] = [];
    for (const p of items) {
      if (p.kind === 'billPaid') { await setBillPaid(p.bill.id, true); success(); out.push({ id: uid++, role: 'kwik', tone: 'ok', text: `${p.bill.name} marked as paid (${money(p.bill.amount)}). One less thing to think about.` }); }
      else if (p.kind === 'income' && buffer) {
        const ok = await addIncome(buffer.id, p.amount, p.note);
        if (ok) { success(); setBurst((b) => b + 1); out.push({ id: uid++, role: 'kwik', tone: 'ok', text: `Nice. ${money(p.amount)} added to your Buffer jar. Your daily number just went up.` }); }
      } else if (p.kind === 'spend') {
        const jarId = open.find((j) => j.key === p.jarKey)?.id ?? null;
        out.push({ id: uid++, role: 'spend', amount: p.amount, merchant: p.merchant, category: p.category, jarId, saved: false, picking: !jarId, daysAgo: p.daysAgo, note: p.note, source: p.source });
      } else { warn(); out.push({ id: uid++, role: 'kwik', text: 'I need an amount to log it. Try "uber 14", "coffee 4, bus 2" or "rent paid".' }); }
    }
    push(...out);
  };

  useEffect(() => { if (q && q !== lastQ.current && cycle) { lastQ.current = q; send(q); } }, [q, cycle?.id]);

  const save = async (m: SpendMsg) => {
    if (!m.jarId || !cycle) return;
    const jar = jars.find((j) => j.id === m.jarId);
    let date = addDays(todayStr(), -m.daysAgo); if (date < cycle.start_date) date = cycle.start_date;
    patch(m.id, { saved: true }); thud();
    const res = await addTx({ jarId: m.jarId, amount: m.amount, merchant: m.merchant, category: m.category, date, note: m.note });
    if (!res) { patch(m.id, { saved: false }); return; }
    if (jar) learn(m.merchant, m.category, jar.key);
    success();
    const after = snapshot(cycle, jars, [res, ...txs], moves, bills, incomes);
    if (after.leftToday >= 0) setBurst((b) => b + 1);
    afterLog(after.leftToday >= 0);
  };

  const scan = async () => {
    setScanning(true); const r = await scanReceipt('camera'); setScanning(false);
    if (r.ok) { setPrefill(r.prefill); setManual(true); return; }
    if (r.reason === 'limit') router.push({ pathname: '/paywall', params: { from: 'receipt' } });
    else if (r.reason === 'unreadable') showToast("Couldn't read that receipt. Try again in better light.", { tone: 'error' });
    else if (r.reason === 'denied') showToast('Allow camera access in Settings to scan receipts.', { tone: 'error' });
    else if (r.reason === 'error') showToast(r.message ?? 'Something went wrong. Try again.', { tone: 'error' });
  };

  const ActionChip = ({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) => (
    <Press onPress={onPress} label={label}><View style={[{ height: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: C.ink, flexDirection: 'row', alignItems: 'center', gap: 8 }, shadow.soft]}><Icon name={icon} size={16} color={C.green} /><Text style={{ fontFamily: F.b, fontSize: 13, color: '#fff' }}>{label}</Text></View></Press>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <LinearGradient colors={['#F8F9F8', '#EEF0EE']} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ paddingTop: ins.top + 8, paddingHorizontal: 18, paddingBottom: 6 }}>
          <Header kicker={snap ? `${money(snap.leftToday)} left today` : ' '} title="Log with Kwik"
            right={<View style={{ flexDirection: 'row', gap: 8 }}><IconBtn name="camera" label="Scan a receipt" onPress={scan} /><IconBtn name="edit" label="Add manually" onPress={() => { setPrefill(null); setManual(true); }} /></View>} />
        </View>
        <ScrollView ref={ref} style={{ flex: 1 }} contentContainerStyle={{ padding: 18, gap: 12, flexGrow: 1 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
          {msgs.length === 0 && (
            <Animated.View entering={FadeIn.duration(400)} style={{ alignItems: 'center', marginTop: 4 }}>
              <IlloChat size={170} />
              <Text style={[TYPE.h2, { textAlign: 'center', marginTop: 6 }]}>Just type it like a text</Text>
              <T style={{ color: C.muted, textAlign: 'center', marginTop: 6, lineHeight: 21, paddingHorizontal: 16 }}>Several items at once, past days and splits all work. Kwik learns where you file things.</T>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 14 }}>
                {SUGGEST.map((s, i) => (
                  <Animated.View key={s} entering={FadeInDown.delay(200 + i * 60).springify()}>
                    <Press onPress={() => send(s)} label={s}><View style={[{ height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: '#fff', justifyContent: 'center' }, shadow.soft]}><Text style={{ fontFamily: F.b, fontSize: 13 }}>{s}</Text></View></Press>
                  </Animated.View>
                ))}
              </View>
              <Animated.View entering={FadeInDown.delay(560).springify()} style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                <ActionChip icon="camera" label="Scan a receipt" onPress={scan} />
                <ActionChip icon="upload" label="Import a statement" onPress={() => router.push('/import')} />
              </Animated.View>
            </Animated.View>
          )}
          {msgs.map((m) => {
            if (m.role === 'me') return (
              <Animated.View key={m.id} entering={FadeInUp.springify().damping(15)} style={{ alignSelf: 'flex-end', maxWidth: '80%', borderRadius: 22, borderBottomRightRadius: 6, overflow: 'hidden' }}>
                <LinearGradient colors={['#2C322C', '#050605']} style={{ paddingVertical: 12, paddingHorizontal: 16 }}><Text style={{ fontFamily: F.b, color: '#fff', fontSize: 15 }}>{m.text}</Text></LinearGradient>
              </Animated.View>
            );
            if (m.role === 'typing') return (
              <Animated.View key={m.id} entering={FadeIn.duration(150)} style={[{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fff', borderRadius: 18, borderBottomLeftRadius: 6, paddingHorizontal: 16, paddingVertical: 14 }, shadow.soft]}>
                {m.ai && <><Icon name="sparkles" size={14} color={C.deepGreen} /><Text style={{ fontFamily: F.s, fontSize: 12, color: C.deepGreen, marginRight: 4 }}>Kwik AI is reading</Text></>}
                <Dot i={0} /><Dot i={1} /><Dot i={2} />
              </Animated.View>
            );
            if (m.role === 'kwik') return (
              <Animated.View key={m.id} entering={FadeInDown.springify().damping(15)} style={[{ alignSelf: 'flex-start', maxWidth: '88%', backgroundColor: m.tone === 'pro' ? C.ink : '#fff', borderRadius: 22, borderBottomLeftRadius: 6, padding: 14 }, shadow.soft]}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {m.tone === 'ok' && <Icon name="check" size={18} color={C.deepGreen} sw={2.6} />}
                  {m.tone === 'pro' && <Icon name="sparkles" size={18} color={C.green} />}
                  <T style={{ flex: 1, lineHeight: 20, color: m.tone === 'pro' ? '#fff' : C.ink }}>{m.text}</T>
                </View>
                {m.action && (
                  <Press onPress={() => router.push(m.action!.go === 'paywall' ? { pathname: '/paywall', params: { from: 'ai' } } : '/import')} label={m.action.label} style={{ marginTop: 10, alignSelf: 'flex-start' }}>
                    <LinearGradient colors={[C.mint, C.green]} style={{ height: 36, borderRadius: 18, paddingHorizontal: 14, justifyContent: 'center' }}><Text style={{ fontFamily: F.x, fontSize: 13 }}>{m.action.label}</Text></LinearGradient>
                  </Press>
                )}
              </Animated.View>
            );
            const jar = jars.find((j) => j.id === m.jarId);
            const before = jar && snap ? snap.jarLeft[jar.id] : 0;
            const counts = m.daysAgo === 0; // only today's spending changes "left today"
            const afterToday = snap ? snap.leftToday - (m.saved || !counts ? 0 : m.amount) : 0;
            return (
              <Animated.View key={m.id} layout={LinearTransition.springify().damping(17)} entering={ZoomIn.springify().damping(14).stiffness(160)}
                style={[{ alignSelf: 'flex-start', width: '92%', backgroundColor: '#fff', borderRadius: 26, borderBottomLeftRadius: 8, padding: 14 }, shadow.card]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <CatTile category={m.category} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: F.x, fontSize: 15 }}>{m.merchant}</Text>
                    <Text style={TYPE.small}>{catByKey(m.category).label}{jar ? ` · ${jar.name} jar` : ''}{m.daysAgo ? ` · ${dayLabel(m.daysAgo)}` : ''}</Text>
                  </View>
                  <Text style={{ fontFamily: F.x, fontSize: 18 }}>-{money(m.amount)}</Text>
                </View>
                {(m.note || m.source !== 'rules') && (
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    {m.note && <View style={{ backgroundColor: C.chip, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 }}><Text style={{ fontFamily: F.s, fontSize: 11, color: C.muted }}>{m.note}</Text></View>}
                    {m.source === 'memory' && <View style={{ backgroundColor: C.softGreen, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 }}><Text style={{ fontFamily: F.s, fontSize: 11, color: C.deepGreen }}>Remembered</Text></View>}
                    {m.source === 'ai' && <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center', backgroundColor: C.softGreen, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 }}><Icon name="sparkles" size={11} color={C.deepGreen} /><Text style={{ fontFamily: F.s, fontSize: 11, color: C.deepGreen }}>Kwik AI</Text></View>}
                  </View>
                )}
                {jar && !m.picking ? (
                  <>
                    {!m.saved && snap && (
                      <Animated.View entering={FadeIn} style={{ marginTop: 12, padding: 12, borderRadius: 16, backgroundColor: C.chip, gap: 2 }}>
                        <T style={{ fontSize: 13, lineHeight: 20 }}>{jar.name} jar <Text style={{ fontFamily: F.x }}>{money(before)}</Text>  →  <Text style={{ fontFamily: F.x }}>{money(before - m.amount)}</Text></T>
                        {counts && <T style={{ fontSize: 13, lineHeight: 20 }}>Left today <Text style={{ fontFamily: F.x }}>{money(snap.leftToday)}</Text>  →  <Text style={{ fontFamily: F.x, color: afterToday < 0 ? C.danger : C.deepGreen }}>{money(afterToday)}</Text></T>}
                      </Animated.View>
                    )}
                    {m.saved ? (
                      <Animated.View entering={ZoomIn.springify()} style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 14, backgroundColor: C.softGreen }}>
                        <Icon name="check" size={16} color={C.deepGreen} sw={2.8} />
                        <Text style={{ fontFamily: F.b, color: C.deepGreen, fontSize: 13 }}>Saved{snap ? ` · ${money(snap.leftToday)} left today` : ''}</Text>
                      </Animated.View>
                    ) : (
                      <View style={{ marginTop: 12, flexDirection: 'row', gap: 8 }}>
                        <Press onPress={() => save(m)} style={{ flex: 1 }} label="Save"><LinearGradient colors={[C.mint, C.green]} style={btn}><Text style={{ fontFamily: F.x, fontSize: 14 }}>Save</Text></LinearGradient></Press>
                        <Press onPress={() => patch(m.id, { picking: true })} style={{ flex: 1 }} label="Change jar"><View style={[btn, { backgroundColor: C.chip }]}><Text style={{ fontFamily: F.x, fontSize: 14 }}>Change jar</Text></View></Press>
                      </View>
                    )}
                  </>
                ) : (
                  <Animated.View entering={FadeIn}>
                    <T style={{ marginTop: 10, color: C.muted }}>Which jar should this come from? I'll remember for next time.</T>
                    <View style={{ marginTop: 8, flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                      {open.map((j) => (
                        <Press key={j.id} onPress={() => patch(m.id, { jarId: j.id, picking: false })} label={j.name}>
                          <View style={[btn, { paddingHorizontal: 16, backgroundColor: j.id === m.jarId ? C.ink : C.chip }]}>
                            <Text style={{ fontFamily: F.x, fontSize: 13, color: j.id === m.jarId ? '#fff' : C.ink }}>{j.name} · {money(snap?.jarLeft[j.id] ?? 0, 0)}</Text>
                          </View>
                        </Press>
                      ))}
                    </View>
                  </Animated.View>
                )}
              </Animated.View>
            );
          })}
        </ScrollView>
        <View style={{ paddingHorizontal: 18, paddingBottom: 100 }}>
          <View style={[{ height: 58, borderRadius: 29, backgroundColor: '#fff', paddingLeft: 20, paddingRight: 7, flexDirection: 'row', alignItems: 'center', gap: 8 }, shadow.card]}>
            <TextInput value={text} onChangeText={setText} onSubmitEditing={() => send(text)} returnKeyType="send" submitBehavior="submit"
              placeholder="coffee 4, uber 14 yesterday…" placeholderTextColor={C.faint} style={{ flex: 1, fontFamily: F.b, fontSize: 15, color: C.ink }} />
            <Press onPress={() => send(text)} label="Send" scale={0.9}>
              <LinearGradient colors={text ? [C.mint, C.green, C.green2] : ['#E6EAE6', '#DCE1DC']} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="send" size={19} sw={2.4} color={text ? C.ink : C.faint} />
              </LinearGradient>
            </Press>
          </View>
        </View>
      </KeyboardAvoidingView>
      {burst > 0 && <Burst key={burst} origin="bottom" n={36} power={800} />}
      {scanning && (
        <Animated.View entering={FadeIn} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(6,8,6,.55)', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 24, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 10 }}><Icon name="sparkles" color={C.deepGreen} /><Text style={{ fontFamily: F.b }}>Reading your receipt…</Text></View>
        </Animated.View>
      )}
      <TxSheet visible={manual} tx={null} prefill={prefill} onClose={() => { setManual(false); setPrefill(null); }} />
    </View>
  );
}
const btn = { height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' } as const;
