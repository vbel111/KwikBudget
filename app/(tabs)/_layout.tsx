import { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { TabBar } from '@/components/TabBar';
import { RatingSheet } from '@/components/RatingSheet';
import { useStore } from '@/lib/store';
import { snapshot } from '@/lib/money';
import { scheduleAll } from '@/lib/notify';

export default function TabsLayout() {
  const { cycle, bills, jars, txs, moves, incomes, pro } = useStore();

  // Keep reminders in sync with the plan (bill reminders are a Pro feature).
  useEffect(() => {
    if (!cycle) return;
    const t = setTimeout(() => {
      const s = snapshot(cycle, jars, txs, moves, bills, incomes);
      scheduleAll({ bills, payday: cycle.payday, allowance: s.allowance, billReminders: pro }).catch(() => {});
    }, 1500);
    return () => clearTimeout(t);
  }, [cycle?.id, bills, pro]);

  return (
    <>
      <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, animation: 'shift' }}>
        <Tabs.Screen name="today" /><Tabs.Screen name="jars" /><Tabs.Screen name="chat" /><Tabs.Screen name="bills" /><Tabs.Screen name="insights" />
      </Tabs>
      <RatingSheet />
    </>
  );
}
