import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import Animated, { FadeIn, FadeInDown, LinearTransition, ZoomIn } from 'react-native-reanimated';
import { Screen } from '@/components/Screen';
import { Card, CatTile, Cta, Ghost, IconBtn, Press, T } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { LogoMark } from '@/components/LogoMark';
import { Burst } from '@/components/Burst';
import { IlloEmpty, Floaty } from '@/components/Illustrations';
import { aiStatement, aiUsage, StatementRow } from '@/lib/ai';
import { useStore } from '@/lib/store';
import { catByKey } from '@/lib/categories';
import { merchantKey } from '@/lib/parser';
import { daysBetween, fmtLong, money, moneyShort, todayStr } from '@/lib/money';
import { nextRenewal } from '@/lib/subscriptions';
import { C, F, TYPE } from '@/lib/theme';
import { success, tap, warn } from '@/lib/fx';

type Row = StatementRow & { id: number; on: boolean; status: 'new' | 'duplicate' | 'before' | 'income' | 'transfer'; jarKey: string };
const MAX_BYTES = 6 * 1024 * 1024;

/**
 * Statement import: pick a PDF or CSV → Kwik AI extracts every row → review → add.
 * The file is read on the phone, sent once to the AI, and never stored.
 */
export default function Import() {
  const r = useRouter();
  const { cycle, txs, jars, bills, memory, pro, addTxBatch, addBill, learn, showToast } = useStore();
  const [phase, setPhase] = useState<'pick' | 'reading' | 'review' | 'done'>('pick');
  const [rows, setRows] = useState<Row[]>([]); const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false); const [added, setAdded] = useState(0); const [tries, setTries] = useState<number | null>(null);
  const [subsAdded, setSubsAdded] = useState<string[]>([]);

  useEffect(() => { if (!pro) aiUsage().then((u) => u && setTries(u.usage.statement.left)); }, [pro]);

  const pick = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'text/csv', 'text/comma-separated-values', 'text/plain', 'application/vnd.ms-excel'], copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    if ((a.size ?? 0) > MAX_BYTES) { warn(); showToast('That file is over 6 MB. Export a shorter date range.', { tone: 'error' }); return; }
    setFileName(a.name); setPhase('reading');
    const isPdf = (a.mimeType ?? '').includes('pdf') || a.name.toLowerCase().endsWith('.pdf');
    const payload = isPdf
      ? { mime: 'application/pdf', base64: await FileSystem.readAsStringAsync(a.uri, { encoding: FileSystem.EncodingType.Base64 }) }
      : { mime: 'text/plain', text: await FileSystem.readAsStringAsync(a.uri) };
    FileSystem.deleteAsync(a.uri, { idempotent: true }).catch(() => {}); // we never keep the file
    const out = await aiStatement(payload);
    if (!out.ok) {
      setPhase('pick');
      if (out.reason === 'limit') return r.push({ pathname: '/paywall', params: { from: 'statement' } });
      return showToast(out.reason === 'offline' ? 'You look offline. Try again.' : out.message ?? "Couldn't read that statement.", { tone: 'error' });
    }
    if (!out.data.rows?.length) { setPhase('pick'); return showToast('No transactions found in that file.', { tone: 'error' }); }
    setRows(classify(out.data.rows)); setPhase('review'); success();
  };

  const classify = (list: StatementRow[]): Row[] => list
    .filter((x) => x.amount > 0 && /^\d{4}-\d{2}-\d{2}$/.test(x.date))
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((x, i) => {
      const mem = memory[merchantKey(x.merchant)];
      const category = mem?.category ?? catByKey(x.category).key;
      const jarKey = mem?.jar_key ?? catByKey(category).jar;
      let status: Row['status'] = 'new';
      if (x.transfer) status = 'transfer';
      else if (x.direction === 'in') status = 'income';
      else if (cycle && x.date < cycle.start_date) status = 'before';
      else if (txs.some((t) => Math.abs(t.amount - x.amount) < 0.01 && Math.abs(daysBetween(t.occurred_on, x.date)) <= 2)) status = 'duplicate';
      return { ...x, category, id: i, on: status === 'new', status, jarKey };
    });

  const chosen = rows.filter((x) => x.on);
  const total = chosen.reduce((s, x) => s + x.amount, 0);
  const recurring = useMemo(() => {
    const known = new Set(bills.map((b) => merchantKey(b.name)));
    const seen = new Map<string, Row>();
    for (const x of rows) if (x.recurring && x.direction === 'out' && !x.transfer && !known.has(merchantKey(x.merchant)) && !seen.has(merchantKey(x.merchant))) seen.set(merchantKey(x.merchant), x);
    return [...seen.values()].slice(0, 6);
  }, [rows, bills]);

  const doImport = async () => {
    if (!chosen.length) return;
    setBusy(true);
    const payload = chosen.map((x) => {
      const jar = jars.find((j) => j.key === x.jarKey && !j.locked) ?? jars.find((j) => j.key === 'buffer')!;
      return { jarId: jar.id, amount: x.amount, merchant: x.merchant, category: x.category, date: x.date, note: 'From statement' };
    });
    const n = await addTxBatch(payload);
    chosen.forEach((x) => learn(x.merchant, x.category, x.jarKey as any));
    setBusy(false);
    if (n) { success(); setAdded(n); setPhase('done'); }
  };

  const addSub = async (x: Row) => {
    let due = nextRenewal(x.date, 'monthly'); while (due < todayStr()) due = nextRenewal(due, 'monthly');
    const ok = await addBill(x.merchant, x.amount, due, { kind: 'subscription', billing: 'monthly' });
    if (ok) { tap(); setSubsAdded((s) => [...s, merchantKey(x.merchant)]); }
  };

  const label: Record<Row['status'], string> = { new: '', duplicate: 'Already logged', before: 'Before this plan', income: 'Money in', transfer: 'Transfer' };

  if (phase === 'reading') return (
    <Screen scroll={false} style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View entering={FadeIn} style={{ alignItems: 'center' }}>
        <LogoMark size={70} tone="light" />
        <Text style={[TYPE.h2, { marginTop: 18 }]}>Reading your statement</Text>
        <T style={{ color: C.muted, marginTop: 6, textAlign: 'center' }}>{fileName}{'\n'}Kwik AI is finding every transaction. This takes a few seconds.</T>
      </Animated.View>
    </Screen>
  );

  if (phase === 'done') return (
    <Screen scroll={false} style={{ alignItems: 'center', justifyContent: 'center' }} footer={<Cta title="Back to my plan" onPress={() => r.replace('/(tabs)/today')} />}>
      <Animated.View entering={ZoomIn.springify()} style={{ alignItems: 'center' }}>
        <View style={{ width: 90, height: 90, borderRadius: 45, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={44} sw={3} /></View>
        <Text style={[TYPE.h1, { marginTop: 18, textAlign: 'center' }]}>{added} entries added</Text>
        <T style={{ color: C.muted, marginTop: 6, textAlign: 'center' }}>Your jars and daily number are up to date.{subsAdded.length ? `\n${subsAdded.length} subscription${subsAdded.length > 1 ? 's' : ''} now tracked.` : ''}</T>
      </Animated.View>
      <Burst />
    </Screen>
  );

  if (phase === 'review') return (
    <Screen bottom={130} footer={<Cta title={chosen.length ? `Add ${chosen.length} entries · ${moneyShort(total)}` : 'Nothing selected'} disabled={!chosen.length} loading={busy} onPress={doImport} />}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <IconBtn name="back" label="Back" onPress={() => setPhase('pick')} size={44} />
        <View style={{ flex: 1 }}><Text style={TYPE.h2}>Review</Text><Text style={TYPE.small} numberOfLines={1}>{rows.length} found in {fileName}</Text></View>
      </View>
      <T style={{ color: C.muted, marginTop: 12, lineHeight: 20 }}>New spending since your plan started is ticked. Duplicates, transfers, money in and older entries are left out. Tap a row to include or skip it.</T>

      {recurring.length > 0 && (
        <Animated.View entering={FadeInDown.springify()}>
          <Text style={[TYPE.h3, { marginTop: 18, marginBottom: 8 }]}>Looks like subscriptions</Text>
          <Card style={{ paddingHorizontal: 16 }}>
            {recurring.map((x, i) => {
              const done = subsAdded.includes(merchantKey(x.merchant));
              return (
                <View key={x.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, height: 60, borderTopWidth: i ? 1 : 0, borderColor: C.line }}>
                  <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: '#E9E6FF', alignItems: 'center', justifyContent: 'center' }}><Icon name="repeat" size={18} /></View>
                  <View style={{ flex: 1 }}><Text style={{ fontFamily: F.b, fontSize: 15 }}>{x.merchant}</Text><Text style={TYPE.small}>{money(x.amount)} a month</Text></View>
                  {done ? <Icon name="check" color={C.deepGreen} sw={2.6} /> : (
                    <Press onPress={() => addSub(x)} label={`Track ${x.merchant}`}><View style={{ height: 34, paddingHorizontal: 14, borderRadius: 17, backgroundColor: C.ink, justifyContent: 'center' }}><Text style={{ fontFamily: F.x, fontSize: 12, color: '#fff' }}>Track</Text></View></Press>
                  )}
                </View>
              );
            })}
          </Card>
        </Animated.View>
      )}

      <Text style={[TYPE.h3, { marginTop: 18, marginBottom: 8 }]}>Transactions</Text>
      <Card style={{ paddingHorizontal: 16 }}>
        {rows.map((x, i) => (
          <Animated.View key={x.id} layout={LinearTransition} entering={FadeInDown.delay(Math.min(i, 12) * 30)}>
            <Press onPress={() => {
              if (x.status === 'income' || x.status === 'transfer' || x.status === 'before') { warn(); showToast(x.status === 'before' ? 'This is from before your current plan started.' : x.status === 'income' ? 'Money in is added from Jars > Got extra money.' : 'Transfers between your own accounts are not spending.'); return; }
              tap(); setRows((rs) => rs.map((y) => (y.id === x.id ? { ...y, on: !y.on } : y)));
            }} label={x.merchant} scale={0.99} haptic={false}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, height: 64, borderTopWidth: i ? 1 : 0, borderColor: C.line, opacity: x.on ? 1 : 0.55 }}>
                <View style={{ width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: x.on ? C.green2 : '#C9CEC9', backgroundColor: x.on ? C.green : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                  {x.on && <Icon name="check" size={14} sw={3} />}
                </View>
                <CatTile category={x.category} size={38} />
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ fontFamily: F.b, fontSize: 14 }}>{x.merchant}</Text>
                  <Text style={TYPE.small}>{fmtLong(x.date)} · {catByKey(x.category).label}{label[x.status] ? ` · ${label[x.status]}` : ''}</Text>
                </View>
                <Text style={{ fontFamily: F.x, fontSize: 14, color: x.direction === 'in' ? C.deepGreen : C.ink }}>{x.direction === 'in' ? '+' : '-'}{money(x.amount)}</Text>
              </View>
            </Press>
          </Animated.View>
        ))}
      </Card>
    </Screen>
  );

  return (
    <Screen bottom={150} footer={<View><Cta title="Choose a PDF or CSV" icon="upload" onPress={pick} /><Ghost title="Not now" color={C.muted} onPress={() => r.back()} /></View>}>
      <IconBtn name="back" label="Back" onPress={() => r.back()} size={44} />
      <Floaty style={{ alignItems: 'center', marginTop: 8 }}><IlloEmpty size={170} /></Floaty>
      <Animated.Text entering={FadeInDown.springify()} style={[TYPE.h1, { marginTop: 6 }]}>Import a statement</Animated.Text>
      <Animated.Text entering={FadeInDown.delay(60).springify()} style={[TYPE.body, { color: C.muted, marginTop: 6 }]}>
        Catch everything you forgot to log. Download a statement from your bank, card or mobile money app and pick it here.
      </Animated.Text>
      <View style={{ gap: 12, marginTop: 18 }}>
        {[
          { icon: 'sparkles' as const, t: 'Kwik AI reads it', s: 'PDF or CSV, any bank or mobile money' },
          { icon: 'check' as const, t: 'You review every row', s: 'Duplicates and transfers are skipped for you' },
          { icon: 'shield' as const, t: 'Your file is never stored', s: 'Read once, then deleted. Only the entries you add are saved' },
        ].map((x, i) => (
          <Animated.View key={x.t} entering={FadeInDown.delay(120 + i * 70).springify()} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: C.softGreen, alignItems: 'center', justifyContent: 'center' }}><Icon name={x.icon} size={18} color={C.deepGreen} /></View>
            <View style={{ flex: 1 }}><Text style={{ fontFamily: F.b, fontSize: 15 }}>{x.t}</Text><Text style={TYPE.small}>{x.s}</Text></View>
          </Animated.View>
        ))}
      </View>
      {!pro && tries != null && (
        <View style={{ marginTop: 18, flexDirection: 'row', gap: 8, alignItems: 'center', padding: 12, borderRadius: 16, backgroundColor: tries > 0 ? C.softGreen : C.softGold }}>
          <Icon name={tries > 0 ? 'gift' : 'crown'} size={16} color={tries > 0 ? C.deepGreen : C.warnInk} />
          <Text style={{ flex: 1, fontFamily: F.s, fontSize: 13, color: tries > 0 ? C.deepGreen : C.warnInk }}>
            {tries > 0 ? `You have ${tries} free import to try. Unlimited with Pro.` : 'Statement import is part of Pro.'}
          </Text>
        </View>
      )}
    </Screen>
  );
}
