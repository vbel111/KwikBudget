import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { Sheet } from './Sheet';
import { Chip, Cta, Ghost, Press } from './ui';
import { Icon, categoryIcon } from './Icon';
import { useStore } from '@/lib/store';
import { CATEGORIES, catByKey } from '@/lib/categories';
import { addDays, currencySymbol, fmtLong, snapshot, todayStr } from '@/lib/money';
import { afterLog } from '@/lib/afterLog';
import { C, F, TYPE } from '@/lib/theme';
import { success, warn } from '@/lib/fx';
import type { Tx } from '@/lib/types';
import type { Prefill } from '@/lib/scan';

/** Add or edit a single expense: amount, what, category, jar, day and note. */
export function TxSheet({ visible, tx, onClose, prefill }: { visible: boolean; tx: Tx | null; onClose: () => void; prefill?: Prefill | null }) {
  const { jars, addTx, updateTx, deleteTx, cycle, txs, moves, bills, incomes, learn } = useStore();
  const open = jars.filter((j) => !j.locked);
  const [amount, setAmount] = useState(''); const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState('other'); const [jarId, setJarId] = useState<string | undefined>();
  const [day, setDay] = useState(todayStr()); const [note, setNote] = useState(''); const [busy, setBusy] = useState(false);
  const shake = useSharedValue(0);
  const sh = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  useEffect(() => {
    if (!visible) return;
    const cat0 = tx?.category ?? prefill?.category ?? 'dining';
    setAmount(tx ? String(tx.amount) : prefill?.amount ? String(prefill.amount) : ''); setMerchant(tx?.merchant ?? prefill?.merchant ?? ''); setCategory(cat0);
    setJarId(tx?.jar_id ?? open.find((j) => j.key === catByKey(cat0).jar)?.id ?? open[0]?.id);
    setDay(tx?.occurred_on ?? (prefill?.date && (!cycle || prefill.date >= cycle.start_date) ? prefill.date : todayStr())); setNote(tx?.note ?? '');
  }, [visible, tx?.id, prefill]);

  const pickCategory = (k: string) => {
    setCategory(k);
    if (!tx) { const j = open.find((x) => x.key === catByKey(k).jar); if (j) setJarId(j.id); }
  };
  const days = useMemo(() => [0, -1, -2, -3].map((n) => addDays(todayStr(), n)).filter((d) => !cycle || d >= cycle.start_date), [cycle?.start_date]);

  const save = async () => {
    const v = Number(amount.replace(',', '.'));
    if (!(v > 0) || !jarId) { warn(); shake.value = withSequence(withTiming(-8, { duration: 50 }), withTiming(8, { duration: 60 }), withTiming(0, { duration: 50 })); return; }
    setBusy(true);
    const label = merchant.trim() || catByKey(category).label;
    const jarKey = jars.find((j) => j.id === jarId)?.key;
    if (merchant.trim() && jarKey) learn(merchant.trim(), category, jarKey); // remember this merchant next time
    if (tx) await updateTx(tx.id, { amount: v, merchant: label, category, jar_id: jarId, occurred_on: day, note: note.trim() || null });
    else {
      const res = await addTx({ jarId, amount: v, merchant: label, category, date: day, note: note.trim() || null });
      if (res && cycle) { const s = snapshot(cycle, jars, [res, ...txs], moves, bills, incomes); afterLog(s.leftToday >= 0); }
    }
    setBusy(false); success(); onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={tx ? 'Edit entry' : prefill ? 'Check the receipt' : 'Add expense'}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={{ maxHeight: 560 }}>
        <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 6 }, sh]}>
          <Text style={{ fontFamily: F.x, fontSize: 36, color: C.faint }}>{currencySymbol()}</Text>
          <TextInput value={amount} onChangeText={(t) => setAmount(t.replace(/[^0-9.,]/g, ''))} keyboardType="decimal-pad" placeholder="0" placeholderTextColor="#C9CEC9"
            autoFocus={!tx} style={{ fontFamily: F.x, fontSize: 52, letterSpacing: -2, color: C.ink, padding: 0, minWidth: 60 }} />
        </Animated.View>
        <TextInput value={merchant} onChangeText={setMerchant} placeholder="What was it? (e.g. Mama's)" placeholderTextColor={C.faint}
          style={{ marginTop: 10, height: 52, borderRadius: 18, backgroundColor: C.chip, paddingHorizontal: 16, fontFamily: F.b, fontSize: 15, color: C.ink }} />

        <Text style={[TYPE.caption, { marginTop: 16, marginBottom: 8 }]}>Category</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {CATEGORIES.map((c) => (
            <Press key={c.key} onPress={() => pickCategory(c.key)} label={c.label}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 12, borderRadius: 18, backgroundColor: category === c.key ? C.ink : c.tint }}>
                <Icon name={categoryIcon(c.key)} size={14} color={category === c.key ? C.green : C.ink} />
                <Text style={{ fontFamily: F.b, fontSize: 12, color: category === c.key ? '#fff' : C.ink }}>{c.label}</Text>
              </View>
            </Press>
          ))}
        </View>

        <Text style={[TYPE.caption, { marginTop: 16, marginBottom: 8 }]}>From jar</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {open.map((j) => <Chip key={j.id} label={j.name} on={jarId === j.id} onPress={() => setJarId(j.id)} />)}
        </View>

        <Text style={[TYPE.caption, { marginTop: 16, marginBottom: 8 }]}>When</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {days.map((d, i) => <Chip key={d} label={i === 0 ? 'Today' : i === 1 ? 'Yesterday' : fmtLong(d)} on={day === d} onPress={() => setDay(d)} />)}
        </View>

        <TextInput value={note} onChangeText={setNote} placeholder="Add a note (optional)" placeholderTextColor={C.faint}
          style={{ marginTop: 16, height: 48, borderRadius: 16, backgroundColor: C.chip, paddingHorizontal: 16, fontFamily: F.r, fontSize: 14, color: C.ink }} />
      </ScrollView>
      <View style={{ marginTop: 14 }}><Cta title={tx ? 'Save changes' : 'Add expense'} loading={busy} onPress={save} /></View>
      {tx && <Ghost title="Delete entry" color={C.danger} onPress={() => { deleteTx(tx.id); onClose(); }} />}
    </Sheet>
  );
}
