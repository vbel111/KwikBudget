import { useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Screen } from '@/components/Screen';
import { Card, Chip, IconBtn, Press, T } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { TxRow } from '@/components/TxRow';
import { TxSheet } from '@/components/TxSheet';
import { IlloEmpty } from '@/components/Illustrations';
import { useStore } from '@/lib/store';
import { requirePro } from '@/lib/afterLog';
import { exportCsv } from '@/lib/export';
import { catByKey } from '@/lib/categories';
import { fmtRelative, groupByDay, money } from '@/lib/money';
import { C, F, TYPE, shadow } from '@/lib/theme';
import type { Tx } from '@/lib/types';

/** Every entry in this cycle, grouped by day, with jar filters, search (Pro) and CSV export (Pro). */
export default function Activity() {
  const r = useRouter(); const { txs, jars, incomes, deleteTx, pro, profile, showToast } = useStore();
  const [jar, setJar] = useState<string | null>(null); const [q, setQ] = useState('');
  const [edit, setEdit] = useState<Tx | null>(null); const [sheet, setSheet] = useState(false);
  const rows = useMemo(() => txs.filter((t) => (!jar || t.jar_id === jar) && (!q || `${t.merchant} ${catByKey(t.category).label} ${t.note ?? ''}`.toLowerCase().includes(q.toLowerCase()))), [txs, jar, q]);
  const groups = groupByDay(rows);
  const total = rows.reduce((s, t) => s + t.amount, 0);

  return (
    <Screen bottom={60}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <IconBtn name="back" label="Back" onPress={() => r.back()} size={44} />
        <Text style={[TYPE.h2, { flex: 1 }]}>History</Text>
        <IconBtn name="upload" label="Import a statement" size={44} onPress={() => r.push('/import')} />
        <IconBtn name="download" label="Export CSV" size={44} onPress={async () => {
          if (!requirePro(r, 'export')) return;
          try { await exportCsv(txs, jars, profile.currency); } catch { showToast('Export failed. Try again.', { tone: 'error' }); }
        }} />
      </View>

      <Press onPress={() => { if (!pro) requirePro(r, 'search'); }} haptic={false} label="Search" scale={1}>
        <View pointerEvents={pro ? 'auto' : 'none'} style={[{ marginTop: 14, height: 52, borderRadius: 26, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 10 }, shadow.soft]}>
          <Icon name="search" size={18} color={C.muted} />
          <TextInput value={q} onChangeText={setQ} placeholder={pro ? 'Search merchant, category or note' : 'Search is a Pro feature'} placeholderTextColor={C.faint} editable={pro}
            style={{ flex: 1, fontFamily: F.b, fontSize: 15, color: C.ink }} />
          {!pro && <Icon name="crown" size={16} color={C.gold} />}
        </View>
      </Press>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -18, marginTop: 12 }} contentContainerStyle={{ paddingHorizontal: 18, gap: 8 }}>
        <Chip label="All jars" on={!jar} onPress={() => setJar(null)} />
        {jars.filter((j) => !j.locked).map((j) => <Chip key={j.id} label={j.name} on={jar === j.id} onPress={() => setJar(j.id)} />)}
      </ScrollView>

      <Animated.View entering={FadeIn} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, paddingHorizontal: 4 }}>
        <Text style={TYPE.small}>{rows.length} entries this cycle</Text>
        <Text style={{ fontFamily: F.x, fontSize: 13 }}>{money(total)}</Text>
      </Animated.View>

      {groups.length === 0 && (
        <View style={{ alignItems: 'center', marginTop: 30 }}><IlloEmpty size={150} /><Text style={[TYPE.h3, { marginTop: 6 }]}>{q ? 'No matches' : 'No entries yet'}</Text><T style={{ color: C.muted, marginTop: 4 }}>{q ? 'Try another word.' : 'Log your first spend from the + button.'}</T></View>
      )}
      {groups.map((g, gi) => (
        <Animated.View key={g.day} entering={FadeInDown.delay(Math.min(gi, 6) * 60).springify()}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 18, marginBottom: 8, paddingHorizontal: 4 }}>
            <Text style={TYPE.h3}>{fmtRelative(g.day)}</Text>
            <Text style={{ fontFamily: F.b, fontSize: 13, color: C.muted }}>{money(g.rows.reduce((s, t) => s + t.amount, 0))}</Text>
          </View>
          <Card style={{ paddingHorizontal: 16, overflow: 'hidden' }}>
            {g.rows.map((t, i) => <TxRow key={t.id} tx={t} first={i === 0} jar={jars.find((j) => j.id === t.jar_id)} onPress={() => { setEdit(t); setSheet(true); }} onDelete={() => deleteTx(t.id)} />)}
          </Card>
        </Animated.View>
      ))}
      {incomes.length > 0 && !q && !jar && (
        <View style={{ marginTop: 18 }}>
          <Text style={[TYPE.h3, { marginBottom: 8, paddingHorizontal: 4 }]}>Extra income</Text>
          <Card style={{ paddingHorizontal: 16 }}>
            {incomes.map((i, k) => (
              <View key={i.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, height: 58, borderTopWidth: k ? 1 : 0, borderColor: C.line }}>
                <View style={{ width: 42, height: 42, borderRadius: 15, backgroundColor: C.softGreen, alignItems: 'center', justifyContent: 'center' }}><Icon name="gift" size={19} color={C.deepGreen} /></View>
                <View style={{ flex: 1 }}><Text style={{ fontFamily: F.b, fontSize: 15 }}>{i.note || 'Extra income'}</Text><Text style={TYPE.small}>{fmtRelative(i.occurred_on)}</Text></View>
                <Text style={{ fontFamily: F.x, fontSize: 15, color: C.deepGreen }}>+{money(i.amount)}</Text>
              </View>
            ))}
          </Card>
        </View>
      )}
      <TxSheet visible={sheet} tx={edit} onClose={() => setSheet(false)} />
    </Screen>
  );
}
