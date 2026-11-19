import { ReactNode, useEffect, useState } from 'react';
import { Alert, Linking, Share, Switch, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import { Screen } from '@/components/Screen';
import { Card, IconBtn, Press, Rise, SectionTitle } from '@/components/ui';
import { Icon, IconName } from '@/components/Icon';
import { Avatar } from '@/components/Header';
import { CurrencySheet } from '@/components/CurrencySheet';
import { IlloCrown } from '@/components/Illustrations';
import { useStore } from '@/lib/store';
import { useDraft } from '@/lib/draft';
import { disableNotifications, enableNotifications, notificationsEnabled } from '@/lib/notify';
import { manageUrl, restore } from '@/lib/purchases';
import { openNativeReview, sendFeedback } from '@/lib/rating';
import { CURRENCIES } from '@/lib/money';
import { aiUsage, Usage } from '@/lib/ai';
import { C, F, TYPE } from '@/lib/theme';
import { success, tap } from '@/lib/fx';

function Row({ icon, label, value, onPress, right, danger, first }: { icon: IconName; label: string; value?: string; onPress?: () => void; right?: ReactNode; danger?: boolean; first?: boolean }) {
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, height: 58, borderTopWidth: first ? 0 : 1, borderColor: C.line }}>
      <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: danger ? C.softDanger : C.chip, alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={18} color={danger ? C.danger : C.ink} /></View>
      <Text style={{ flex: 1, fontFamily: F.b, fontSize: 15, color: danger ? C.danger : C.ink }}>{label}</Text>
      {value && <Text style={{ fontFamily: F.s, fontSize: 13, color: C.muted }}>{value}</Text>}
      {right ?? (onPress ? <Icon name="chevron" size={18} color={C.faint} /> : null)}
    </View>
  );
  return onPress ? <Press onPress={onPress} label={label} scale={0.99}>{body}</Press> : body;
}

export default function Settings() {
  const r = useRouter();
  const { profile, email, pro, cycle, bills, saveProfile, signOut, deleteAccount, setPro, showToast, isAnonymous } = useStore();
  const prefill = useDraft((s) => s.prefillFrom);
  const [name, setName] = useState(profile.name); const [cur, setCur] = useState(false); const [notif, setNotif] = useState(false);
  useEffect(() => { notificationsEnabled().then(setNotif); }, []);
  const [usage, setUsage] = useState<Usage | null>(null);
  useEffect(() => { aiUsage().then((u) => u && setUsage(u.usage)); }, [pro]);
  const usageLine = usage ? `${usage.chat.left} of ${usage.chat.limit} AI assists left today · ${usage.statement.left} statement · ${usage.receipt.left} receipt ${usage.receipt.scope === 'lifetime' ? 'tries' : 'today'}` : '';

  const confirmDelete = () => Alert.alert('Delete your account?', 'This permanently removes your account, plans and history. Subscriptions are managed by the store and must be cancelled there.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete forever', style: 'destructive', onPress: async () => { const ok = await deleteAccount(); if (ok) showToast('Your account was deleted'); } },
  ]);

  return (
    <Screen bottom={60}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <IconBtn name="back" label="Back" onPress={() => r.back()} size={44} />
        <Text style={[TYPE.h2, { flex: 1 }]}>Settings</Text>
      </View>

      <Rise>
        <Card style={{ marginTop: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Avatar size={56} />
          <View style={{ flex: 1 }}>
            <TextInput value={name} onChangeText={setName} onEndEditing={() => saveProfile({ name: name.trim() })} placeholder="Your name" placeholderTextColor={C.faint}
              style={{ fontFamily: F.x, fontSize: 18, color: C.ink, padding: 0 }} />
            <Text style={[TYPE.small, isAnonymous && { color: C.warnInk }]}>{isAnonymous ? 'Not backed up yet' : email}</Text>
          </View>
          <Icon name="edit" size={16} color={C.faint} />
        </Card>
      </Rise>

      {isAnonymous && (
        <Rise i={1}>
          <Press onPress={() => r.push({ pathname: '/auth', params: { mode: 'backup' } })} label="Back up your data" scale={0.98}>
            <Card style={{ marginTop: 12, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.softGold }}>
              <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}><Icon name="shield" size={20} color={C.warnInk} /></View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.x, fontSize: 15, color: C.ink }}>Back up your data</Text>
                <Text style={[TYPE.small, { marginTop: 2 }]}>Add an email so you don't lose your plan if you delete the app or change phones.</Text>
              </View>
              <Icon name="chevron" size={18} color={C.faint} />
            </Card>
          </Press>
        </Rise>
      )}

      <Rise i={1}>
        <Press onPress={() => (pro ? Linking.openURL(manageUrl) : r.push({ pathname: '/paywall', params: { from: 'settings' } }))} label="Kwik Budget Pro" scale={0.98}>
          <View style={{ marginTop: 12, borderRadius: 28, overflow: 'hidden' }}>
            <LinearGradient colors={['#1C4A26', '#0C120D']} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={{ padding: 18, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.s, fontSize: 12, color: C.lime }}>{pro ? 'YOU ARE PRO' : 'KWIK BUDGET PRO'}</Text>
                <Text style={{ fontFamily: F.x, fontSize: 18, color: '#fff', marginTop: 2 }}>{pro ? 'Thanks for supporting us' : 'Bill reminders, forecast and more'}</Text>
                <Text style={{ fontFamily: F.r, fontSize: 12, color: '#9AA29A', marginTop: 4 }}>{pro ? 'Manage your subscription' : 'Try it free for 7 days'}</Text>
              </View>
              <IlloCrown size={90} />
            </LinearGradient>
          </View>
        </Press>
      </Rise>

      {!pro && !!usageLine && (
        <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 6 }}>
          <Icon name="sparkles" size={14} color={C.deepGreen} />
          <Text style={[TYPE.small, { flex: 1 }]}>Kwik AI: {usageLine}</Text>
        </View>
      )}

      <SectionTitle title="Plan" />
      <Card style={{ paddingHorizontal: 16 }}>
        <Row first icon="upload" label="Import a statement" onPress={() => r.push('/import')} />
        <Row icon="globe" label="Currency" value={CURRENCIES.find((c) => c.code === profile.currency)?.code ?? profile.currency} onPress={() => setCur(true)} />
        <Row icon="repeat" label="Start a new pay cycle" onPress={() => { if (!cycle) return; prefill(cycle.income, bills, cycle.payday); r.push('/onboarding/payday'); }} />
        <Row icon="bell" label="Reminders" right={<Switch value={notif} trackColor={{ true: C.green, false: '#D5D9D5' }} thumbColor="#fff" ios_backgroundColor="#D5D9D5"
          onValueChange={async (v) => { tap(); if (v) { const ok = await enableNotifications(); setNotif(ok); if (!ok) showToast('Turn on notifications for Kwik Budget in your phone settings.', { tone: 'error' }); } else { await disableNotifications(); setNotif(false); } }} />} />
      </Card>

      <SectionTitle title="Support" />
      <Card style={{ paddingHorizontal: 16 }}>
        <Row first icon="doc" label="Help and FAQ" onPress={() => Linking.openURL('https://kwikbudget.app/support')} />
        <Row icon="star" label="Rate Kwik Budget" onPress={openNativeReview} />
        <Row icon="mail" label="Send feedback" onPress={sendFeedback} />
        <Row icon="share" label="Share with a friend" onPress={() => Share.share({ message: 'I use Kwik Budget to know exactly what I can spend each day until payday. https://kwikbudget.app' })} />
        <Row icon="undo" label="Restore purchases" onPress={async () => { const ok = await restore(); if (ok) { setPro(true); success(); showToast('Pro restored'); } else showToast('No purchases found for this account.', { tone: 'error' }); }} />
      </Card>

      <SectionTitle title="Account" />
      <Card style={{ paddingHorizontal: 16 }}>
        <Row first icon="doc" label="Privacy policy" onPress={() => Linking.openURL('https://kwikbudget.app/privacy')} />
        <Row icon="doc" label="Terms of use" onPress={() => Linking.openURL('https://kwikbudget.app/terms')} />
        {isAnonymous
          ? <Row icon="user" label="Sign in to another account" onPress={() => r.push({ pathname: '/auth', params: { mode: 'in' } })} />
          : <Row icon="logout" label="Sign out" onPress={() => Alert.alert('Sign out?', undefined, [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign out', onPress: signOut }])} />}
        <Row icon="trash" label="Delete account" danger onPress={confirmDelete} />
      </Card>
      <Text style={[TYPE.small, { textAlign: 'center', marginTop: 18 }]}>Kwik Budget {Constants.expoConfig?.version ?? ''} · Made for people who get paid, then wonder where it went.</Text>
      <CurrencySheet visible={cur} value={profile.currency} onClose={() => setCur(false)} onPick={(c) => saveProfile({ currency: c })} />
    </Screen>
  );
}
