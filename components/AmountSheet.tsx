import { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Sheet } from './Sheet';
import { Chip, Cta } from './ui';
import { currencySymbol } from '@/lib/money';
import { C, F, TYPE } from '@/lib/theme';
import { warn } from '@/lib/fx';

/** Generic "enter an amount" sheet, used for extra income and editing a jar budget. */
export function AmountSheet({ visible, title, hint, initial, presets, noteLabel, cta, onClose, onSubmit }: {
  visible: boolean; title: string; hint?: string; initial?: number; presets?: number[]; noteLabel?: string; cta: string;
  onClose: () => void; onSubmit: (amount: number, note: string) => Promise<boolean | void>;
}) {
  const [v, setV] = useState(''); const [note, setNote] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { if (visible) { setV(initial ? String(initial) : ''); setNote(''); } }, [visible]);
  const go = async () => {
    const n = Number(v.replace(',', '.'));
    if (!(n >= 0) || v === '') return warn();
    setBusy(true); const ok = await onSubmit(n, note.trim()); setBusy(false);
    if (ok !== false) onClose();
  };
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      {hint && <Text style={[TYPE.body, { color: C.muted, marginTop: 2 }]}>{hint}</Text>}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 14 }}>
        <Text style={{ fontFamily: F.x, fontSize: 36, color: C.faint }}>{currencySymbol()}</Text>
        <TextInput value={v} onChangeText={(t) => setV(t.replace(/[^0-9.,]/g, ''))} keyboardType="decimal-pad" autoFocus placeholder="0" placeholderTextColor="#C9CEC9"
          style={{ fontFamily: F.x, fontSize: 52, letterSpacing: -2, color: C.ink, padding: 0, minWidth: 60 }} />
      </View>
      {presets && <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 10 }}>{presets.map((p) => <Chip key={p} label={`${currencySymbol()}${p}`} on={v === String(p)} onPress={() => setV(String(p))} />)}</View>}
      {noteLabel && <TextInput value={note} onChangeText={setNote} placeholder={noteLabel} placeholderTextColor={C.faint}
        style={{ marginTop: 14, height: 50, borderRadius: 16, backgroundColor: C.chip, paddingHorizontal: 16, fontFamily: F.b, fontSize: 15, color: C.ink }} />}
      <View style={{ marginTop: 16 }}><Cta title={cta} loading={busy} onPress={go} /></View>
    </Sheet>
  );
}
