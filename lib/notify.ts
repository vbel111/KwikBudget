import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addDays, money, parseDay, todayStr } from './money';
import type { Bill } from './types';

const KEY = 'kp.notify';
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

export async function notificationsEnabled() { return (await AsyncStorage.getItem(KEY)) === '1'; }

export async function enableNotifications(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', { name: 'Reminders', importance: Notifications.AndroidImportance.DEFAULT });
  }
  const cur = await Notifications.getPermissionsAsync();
  const res = cur.granted ? cur : await Notifications.requestPermissionsAsync();
  await AsyncStorage.setItem(KEY, res.granted ? '1' : '0');
  return res.granted;
}

export async function disableNotifications() {
  await AsyncStorage.setItem(KEY, '0');
  await Notifications.cancelAllScheduledNotificationsAsync();
}

const at = (day: string, hour: number) => { const d = parseDay(day); d.setHours(hour, 0, 0, 0); return d; };

/**
 * Re-plans every reminder from scratch: bills the day before (9am) and on the day (8am),
 * a gentle 8pm nudge to log the day, and a payday heads-up.
 * `billReminders` is a Pro feature; the daily nudge is free.
 */
export async function scheduleAll(opts: { bills: Bill[]; payday: string; allowance: number; billReminders: boolean }) {
  if (!(await notificationsEnabled())) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  const now = Date.now();
  const plan: { date: Date; title: string; body: string }[] = [];
  if (opts.billReminders) {
    for (const b of opts.bills.filter((x) => !x.paid)) {
      if (b.kind === 'subscription') {
        plan.push({ date: at(addDays(b.due_date, -1), 9), title: `${b.name} renews tomorrow`, body: `${money(b.amount)} will be charged. Still using it? If not, cancel today.` });
        if (b.trial_ends) plan.push({ date: at(addDays(b.trial_ends, -2), 10), title: `${b.name} free trial ends in 2 days`, body: `After that it costs ${money(b.amount)}. Cancel before then if you don't want it.` });
      } else {
        plan.push({ date: at(addDays(b.due_date, -1), 9), title: `${b.name} is due tomorrow`, body: `${money(b.amount)} is already set aside. Mark it paid in Kwik Budget when it goes out.` });
        plan.push({ date: at(b.due_date, 8), title: `${b.name} is due today`, body: `Tap to mark ${money(b.amount)} as paid.` });
      }
    }
  }
  for (let i = 0; i < 7; i++) {
    plan.push({ date: at(addDays(todayStr(), i), 20), title: 'How did today go?', body: 'Log anything you spent so tomorrow’s allowance stays accurate.' });
  }
  plan.push({ date: at(addDays(opts.payday, -1), 18), title: 'Payday is tomorrow', body: 'Your new plan is one tap away.' });
  for (const p of plan.filter((x) => x.date.getTime() > now).slice(0, 60)) {
    await Notifications.scheduleNotificationAsync({
      content: { title: p.title, body: p.body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: p.date },
    });
  }
}
