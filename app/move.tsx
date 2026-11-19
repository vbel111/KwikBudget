import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { Easing, FadeInDown, LinearTransition, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { Sheet } from '@/components/Sheet';
import { Chip, Cta, Press } from '@/components/ui';
import { Odometer } from '@/components/Odometer';
import { Icon } from '@/components/Icon';
import { useStore } from '@/lib/store';
import { currencySymbol, money, moneyShort, round2, snapshot } from '@/lib/money';
import { C, F, TYPE } from '@/lib/theme';
import { success, warn } from '@/lib/fx';

/** Coins drift from one side to the other while you decide, so the action reads instantly. */
function Flow() {
  const t = useSharedValue(0);
  useEffect(() => { t.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }), -1); }, []);
  const coin = (d: number) => useAnimatedStyle(() => {
    const p = (t.value + d) % 1;
    return { opacity: p < 0.15 ? p / 0.15 : p > 0.85 ? (1 - p) / 0.15 : 1, transform: [{ translateX: -22 + p * 44 }] };
  });
  const a = coin(0), b = coin(0.33), c = coin(0.66);
  return (
    <View style={{ width: 52, height: 28, alignItems: 'center', justifyContent: 'center' }}>
      {[a, b, c].map((s, i) => <Animated.View key={i} style={[{ position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: C.gold, borderWidth: 1.5, borderColor: '#C98A00' }, s]} />)}
    </View>
  );
}

export default function Move() {
  const r = useRouter(); const { to: toParam } = useLocalSearchParams<{ to?: string }>();
  const { cycle, jars, txs, moves, bills, incomes, moveMoney } = useStore();
  const snap = useMemo(() => (cycle ? snapshot(cycle, jars, txs, moves, bills, incomes) : null), [cycle, jars, txs, moves, bills, incomes]);
  const buffer = jars.find((j) => j.key === 'buffer'); const food = jars.find((j) => j.key === 'food');
  const [from, setFrom] = useState<string | undefined>(buffer?.id);
  const [to, setTo] = useState<string | undefined>(toParam ?? food?.id);
  const [amt, setAmt] = useState('25'); const [busy, setBusy] = useState(false); const [open, setOpen] = useState(true);
  useEffect(() => { if (from && from === to) setFrom(jars.find((j) => j.id !== to && j.key !== 'bills')?.id); }, [to]);
  const close = () => { setOpen(false); setTimeout(() => r.back(), 230); };
  if (!cycle || !snap) return null;

  const n = Number(amt.replace(',', '.')) || 0;
  const fj = jars.find((j) => j.id === from); const tj = jars.find((j) => j.id === to);
  const avail = fj ? snap.jarLeft[fj.id] : 0;
  const bad = !fj || !tj || fj.id === tj.id || n <= 0 || n > avail;
  const delta = (tj && !tj.locked ? n : 0) - (fj && !fj.locked ? n : 0);
  const next = round2(Math.max(0, snap.spendable + snap.spentToday + delta) / snap.daysLeft);

  const confirm = async () => {
    if (bad || !fj || !tj) return warn();
    setBusy(true); const ok = await moveMoney(fj.id, tj.id, n); setBusy(false);
    if (ok) { success(); useStore.getState().showToast(`Moved ${money(n)} to ${tj.name}`); close(); }
  };
  const pickable = jars.filter((j) => j.key !== 'bills');
  const JarPick = ({ label, sel, set }: { label: string; sel?: string; set: (id: string) => void }) => (
    <View style={{ flex: 1 }}>
      <Text style={[TYPE.caption, { marginBottom: 6 }]}>{label}</Text>
      <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
        {pickable.map((j) => {
          const on = sel === j.id;
          return (
            <Press key={j.id} onPress={() => set(j.id)} label={j.name} scale={0.97}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 46, borderRadius: 16, paddingHorizontal: 12, marginBottom: 6, backgroundColor: on ? C.ink : C.chip }}>
                <Text style={{ flex: 1, fontFamily: F.b, fontSize: 13, color: on ? '#fff' : C.ink }}>{j.name}</Text>
                {j.locked && <Icon name="lock" size={12} color={on ? C.green : C.muted} />}
                <Text style={{ fontFamily: F.s, fontSize: 11, color: on ? '#C3CAC3' : C.muted }}>{moneyShort(snap.jarLeft[j.id])}</Text>
              </View>
            </Press>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <Sheet visible={open} onClose={close} title="Move money">
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: 6 }}>
        <JarPick label="From" sel={from} set={setFrom} />
        <View style={{ marginTop: 90 }}><Flow /></View>
        <JarPick label="To" sel={to} set={setTo} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8 }}>
        <Text style={{ fontFamily: F.x, fontSize: 34, color: C.faint }}>{currencySymbol()}</Text>
        <TextInput value={amt} onChangeText={(t) => setAmt(t.replace(/[^0-9.,]/g, ''))} keyboardType="decimal-pad" style={{ fontFamily: F.x, fontSize: 48, letterSpacing: -2, color: n > avail ? C.danger : C.ink, padding: 0, minWidth: 50 }} />
      </View>
      <Text style={[TYPE.small, { textAlign: 'center', color: n > avail ? C.danger : C.muted }]}>{fj ? `${fj.name} has ${money(avail)}` : ''}</Text>
      <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 10 }}>
        {[10, 25, 50, 100].map((v) => <Chip key={v} label={`${currencySymbol()}${v}`} on={amt === String(v)} onPress={() => setAmt(String(v))} />)}
      </View>
      {fj?.locked && (
        <Animated.View entering={FadeInDown.springify()} layout={LinearTransition} style={{ flexDirection: 'row', gap: 10, marginTop: 14, padding: 12, borderRadius: 18, backgroundColor: C.warn }}>
          <Icon name="warn" size={18} color={C.warnInk} />
          <Text style={{ flex: 1, fontFamily: F.s, color: C.warnInk, fontSize: 13, lineHeight: 19 }}>{fj.name} is locked. Borrowing from it slows your goal down, so only do it if you need to.</Text>
        </Animated.View>
      )}
      <View style={{ marginTop: 12, padding: 14, borderRadius: 18, backgroundColor: C.chip, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: F.s, fontSize: 13, color: C.muted }}>Daily allowance</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontFamily: F.x, fontSize: 14, color: C.muted }}>{money(snap.allowance)}</Text>
          <Icon name="arrow" size={14} color={C.muted} />
          <Odometer value={next} size={16} color={next >= snap.allowance ? C.deepGreen : C.danger} />
        </View>
      </View>
      <View style={{ marginTop: 14 }}><Cta title="Confirm move" loading={busy} disabled={bad} onPress={confirm} /></View>
    </Sheet>
  );
}
