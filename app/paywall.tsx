import { useEffect, useState } from 'react';
import { Linking, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { Cta, Ghost, IconBtn, Press } from '@/components/ui';
import { Icon, IconName } from '@/components/Icon';
import { IlloCrown, Floaty } from '@/components/Illustrations';
import { Burst } from '@/components/Burst';
import { Plan, buy, getPlans, purchasesLive, restore } from '@/lib/purchases';
import { notificationsEnabled } from '@/lib/notify';
import { useStore } from '@/lib/store';
import { COMPARE, FAIR_USE, PRO_FEATURES } from '@/lib/plan';
import { C, F, TYPE } from '@/lib/theme';
import { success, warn } from '@/lib/fx';

/** Each entry point gets a headline about the thing the person just tried to use. */
const HEADLINES: Record<string, { title: string; lead: string }> = {
  ai: { title: 'Kwik AI understands\nanything you type', lead: 'ai' },
  statement: { title: 'Import statements,\nmiss nothing', lead: 'statement' },
  receipt: { title: 'Snap a receipt,\nwe do the rest', lead: 'receipt' },
  subscriptions: { title: 'Catch every renewal\nand price rise', lead: 'subs' },
  insights: { title: 'See where you will\nland before payday', lead: 'insights' },
};
const DEFAULT_HEADLINE = { title: 'Make it to payday,\nevery single time', lead: 'ai' };

function CompareTable() {
  const cell = (v: string | boolean, pro?: boolean) => typeof v === 'boolean'
    ? (v ? <Icon name="check" size={16} sw={2.8} color={pro ? C.green : '#C3CAC3'} /> : <Icon name="minus" size={16} color="#4A524A" />)
    : <Text style={{ fontFamily: F.b, fontSize: 11, color: pro ? C.green : '#C3CAC3', textAlign: 'center' }}>{v}</Text>;
  return (
    <View style={{ marginTop: 22, borderRadius: 24, backgroundColor: 'rgba(255,255,255,.05)', padding: 16 }}>
      <View style={{ flexDirection: 'row', marginBottom: 8 }}>
        <Text style={{ flex: 1, fontFamily: F.x, fontSize: 15, color: '#fff' }}>Free vs Pro</Text>
        <Text style={{ width: 74, textAlign: 'center', fontFamily: F.b, fontSize: 12, color: '#9AA29A' }}>Free</Text>
        <Text style={{ width: 74, textAlign: 'center', fontFamily: F.x, fontSize: 12, color: C.green }}>Pro</Text>
      </View>
      {COMPARE.map((r, i) => (
        <View key={r.label} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 40, borderTopWidth: i ? 1 : 0, borderColor: 'rgba(255,255,255,.06)' }}>
          <Text style={{ flex: 1, fontFamily: F.r, fontSize: 13, color: '#E3E8E3', paddingRight: 8 }}>{r.label}</Text>
          <View style={{ width: 74, alignItems: 'center' }}>{cell(r.free)}</View>
          <View style={{ width: 74, alignItems: 'center' }}>{cell(r.pro, true)}</View>
        </View>
      ))}
      <Text style={{ fontFamily: F.r, fontSize: 10, color: '#7F877F', marginTop: 10 }}>{FAIR_USE}</Text>
    </View>
  );
}

const TERMS = 'https://kwikbudget.app/terms';
const PRIVACY = 'https://kwikbudget.app/privacy';

function PlanCard({ plan, on, onPress, best }: { plan: Plan; on: boolean; onPress: () => void; best?: boolean }) {
  const a = useAnimatedStyle(() => ({ borderColor: on ? C.green : 'rgba(255,255,255,.12)', transform: [{ scale: withSpring(on ? 1 : 0.97, { damping: 13 }) }] }));
  const dot = useAnimatedStyle(() => ({ transform: [{ scale: withSpring(on ? 1 : 0, { damping: 10, stiffness: 260 }) }] }));
  return (
    <Press onPress={onPress} label={`${plan.title} plan`} scale={0.98}>
      <Animated.View style={[{ borderWidth: 2, borderRadius: 24, padding: 16, backgroundColor: on ? 'rgba(61,220,74,.1)' : 'rgba(255,255,255,.05)', flexDirection: 'row', alignItems: 'center', gap: 14 }, a]}>
        <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: on ? C.green : '#4A524A', alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={[{ width: 12, height: 12, borderRadius: 6, backgroundColor: C.green }, dot]} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.x, fontSize: 16, color: '#fff' }}>{plan.title}</Text>
          <Text style={{ fontFamily: F.r, fontSize: 12, color: '#9AA29A', marginTop: 2 }}>
            {plan.trialDays ? `${plan.trialDays} days free, then ${plan.price}/year` : `${plan.price} billed monthly`}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontFamily: F.x, fontSize: 16, color: '#fff' }}>{plan.perMonth ?? plan.price}</Text>
          <Text style={{ fontFamily: F.r, fontSize: 11, color: '#9AA29A' }}>per month</Text>
        </View>
        {best && (
          <View style={{ position: 'absolute', top: -11, right: 16, backgroundColor: C.gold, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 3 }}>
            <Text style={{ fontFamily: F.x, fontSize: 10, color: C.ink }}>BEST VALUE</Text>
          </View>
        )}
      </Animated.View>
    </Press>
  );
}

const Step = ({ icon, title, sub, last, on }: { icon: IconName; title: string; sub: string; last?: boolean; on?: boolean }) => (
  <View style={{ flexDirection: 'row', gap: 12 }}>
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: on ? C.green : '#1E261F', alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={15} color={on ? C.ink : '#C3CAC3'} sw={2.4} /></View>
      {!last && <View style={{ width: 2, flex: 1, minHeight: 18, backgroundColor: '#1E261F' }} />}
    </View>
    <View style={{ flex: 1, paddingBottom: last ? 0 : 12 }}>
      <Text style={{ fontFamily: F.b, fontSize: 14, color: '#fff' }}>{title}</Text>
      <Text style={{ fontFamily: F.r, fontSize: 12, color: '#9AA29A', marginTop: 1 }}>{sub}</Text>
    </View>
  </View>
);

export default function Paywall() {
  const r = useRouter(); const ins = useSafeAreaInsets();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const headline = HEADLINES[from ?? ''] ?? DEFAULT_HEADLINE;
  // The feature they came for goes first.
  const features = [...PRO_FEATURES].sort((a, b) => (a.key === headline.lead ? -1 : b.key === headline.lead ? 1 : 0));
  const setPro = useStore((s) => s.setPro); const toast = useStore((s) => s.showToast);
  const [plans, setPlans] = useState<Plan[]>([]); const [sel, setSel] = useState<'annual' | 'monthly'>('annual');
  const [busy, setBusy] = useState(false); const [closable, setClosable] = useState(false); const [won, setWon] = useState(0);

  useEffect(() => { getPlans().then(setPlans); const t = setTimeout(() => setClosable(true), 2200); return () => clearTimeout(t); }, []);
  const plan = plans.find((p) => p.id === sel) ?? plans[0];
  const close = () => (from === 'onboarding' || !r.canGoBack() ? r.replace('/(tabs)/today') : r.back());

  const purchase = async () => {
    if (!plan) return;
    setBusy(true); const res = await buy(plan); setBusy(false);
    if (res === 'ok') {
      success(); setPro(true); setWon((x) => x + 1);
      // Keep the trial promise: remind two days before the first charge.
      if (plan.trialDays && (await notificationsEnabled())) {
        const date = new Date(Date.now() + (plan.trialDays - 2) * 86400000);
        Notifications.scheduleNotificationAsync({ content: { title: 'Your free trial ends in 2 days', body: 'Cancel anytime in your store settings if Pro is not for you.' }, trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date } }).catch(() => {});
      }
      toast('Welcome to Kwik Budget Pro');
      setTimeout(close, 1400);
    } else if (res === 'error') { warn(); toast('The purchase did not go through. You have not been charged.', { tone: 'error' }); }
  };

  return (
    <LinearGradient colors={['#1C4A26', '#0C120D', '#050705']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.6 }} style={{ flex: 1 }}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ paddingTop: ins.top + 8, paddingHorizontal: 22, paddingBottom: 200 }} showsVerticalScrollIndicator={false}>
        <View style={{ height: 44, alignItems: 'flex-end' }}>
          {closable && <Animated.View entering={FadeIn.duration(400)}><IconBtn name="close" label="Close" dark onPress={close} size={40} /></Animated.View>}
        </View>
        <Floaty style={{ alignItems: 'center', marginTop: -10 }}><IlloCrown size={190} /></Floaty>
        <Animated.Text entering={FadeInDown.springify()} style={{ fontFamily: F.s, fontSize: 13, color: C.lime, textAlign: 'center', letterSpacing: 0.4 }}>KWIK BUDGET PRO</Animated.Text>
        <Animated.Text entering={FadeInDown.delay(60).springify()} style={{ fontFamily: F.x, fontSize: 30, lineHeight: 35, letterSpacing: -0.8, color: '#fff', textAlign: 'center', marginTop: 6 }}>
          {headline.title}
        </Animated.Text>

        <View style={{ marginTop: 22, gap: 14 }}>
          {features.map((f, i) => (
            <Animated.View key={f.title} entering={FadeInDown.delay(150 + i * 70).springify().damping(16)} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(61,220,74,.14)', alignItems: 'center', justifyContent: 'center' }}><Icon name={f.icon} size={19} color={C.green} /></View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.b, fontSize: 15, color: '#fff' }}>{f.title}</Text>
                <Text style={{ fontFamily: F.r, fontSize: 12, color: '#9AA29A', marginTop: 1 }}>{f.sub}</Text>
              </View>
            </Animated.View>
          ))}
        </View>

        <View style={{ marginTop: 26, gap: 14 }}>
          {plans.map((p) => <PlanCard key={p.id} plan={p} on={p.id === sel} best={p.id === 'annual'} onPress={() => setSel(p.id)} />)}
        </View>

        {plan?.trialDays ? (
          <Animated.View entering={FadeInDown.springify()} style={{ marginTop: 22, padding: 18, borderRadius: 24, backgroundColor: 'rgba(255,255,255,.05)' }}>
            <Text style={{ fontFamily: F.x, fontSize: 15, color: '#fff', marginBottom: 12 }}>How your free trial works</Text>
            <Step on icon="sparkles" title="Today" sub="Every Pro feature unlocks. Nothing to pay." />
            <Step icon="bell" title={`Day ${plan.trialDays - 2}`} sub="We remind you that the trial is ending." />
            <Step icon="crown" title={`Day ${plan.trialDays}`} sub={`You are charged ${plan.price}. Cancel anytime before.`} last />
          </Animated.View>
        ) : null}

        <CompareTable />

        <Text style={{ fontFamily: F.r, fontSize: 12, color: '#7F877F', textAlign: 'center', marginTop: 18, lineHeight: 18 }}>
          Your daily number, jars, chat logging and bills stay free forever.{'\n'}Pro adds the tools that keep you ahead.
        </Text>
        {!purchasesLive() && <Text style={{ fontFamily: F.r, fontSize: 11, color: '#E0A100', textAlign: 'center', marginTop: 10 }}>Demo mode: add your RevenueCat keys to sell real subscriptions.</Text>}
      </ScrollView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 22, paddingTop: 14, paddingBottom: ins.bottom + 8, backgroundColor: 'rgba(5,7,5,.92)' }}>
        <Cta title={plan?.trialDays ? 'Start my free week' : 'Continue with Pro'} shine loading={busy} disabled={!plan} onPress={purchase} />
        <Text style={{ fontFamily: F.r, fontSize: 11, color: '#7F877F', textAlign: 'center', marginTop: 8 }}>
          {plan ? (plan.trialDays ? `Free for ${plan.trialDays} days, then ${plan.price} per year. Cancel anytime.` : `${plan.price} per month. Cancel anytime.`) : ' '}
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
          <Ghost title="Restore" color="#C3CAC3" onPress={async () => { const ok = await restore(); if (ok) { setPro(true); success(); toast('Pro restored'); close(); } else toast('No previous purchase found on this account.', { tone: 'error' }); }} />
          <Ghost title="Terms" color="#C3CAC3" onPress={() => Linking.openURL(TERMS)} />
          <Ghost title="Privacy" color="#C3CAC3" onPress={() => Linking.openURL(PRIVACY)} />
        </View>
      </View>
      {won > 0 && <Burst key={won} origin="center" />}
    </LinearGradient>
  );
}
