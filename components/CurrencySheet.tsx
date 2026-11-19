import { ScrollView, Text, View } from 'react-native';
import { CURRENCIES } from '@/lib/money';
import { C, F } from '@/lib/theme';
import { Sheet } from './Sheet';
import { Press } from './ui';
import { Icon } from './Icon';

export function CurrencySheet({ visible, value, onClose, onPick }: { visible: boolean; value: string; onClose: () => void; onPick: (code: string) => void }) {
  return (
    <Sheet visible={visible} onClose={onClose} title="Currency">
      <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
        {CURRENCIES.map((c, i) => (
          <Press key={c.code} onPress={() => { onPick(c.code); onClose(); }} label={c.name} scale={0.98}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, height: 56, borderTopWidth: i ? 1 : 0, borderColor: C.line }}>
              <View style={{ width: 44, height: 36, borderRadius: 12, backgroundColor: C.chip, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: F.x, fontSize: 14 }}>{c.symbol}</Text></View>
              <View style={{ flex: 1 }}><Text style={{ fontFamily: F.b, fontSize: 15 }}>{c.name}</Text><Text style={{ fontFamily: F.r, fontSize: 12, color: C.muted }}>{c.code}</Text></View>
              {value === c.code && <Icon name="check" size={20} color={C.deepGreen} sw={2.6} />}
            </View>
          </Press>
        ))}
      </ScrollView>
    </Sheet>
  );
}
