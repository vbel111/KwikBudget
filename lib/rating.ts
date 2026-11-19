import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import { Linking } from 'react-native';

/**
 * Ask for a rating only at a good moment: after a win (a day closed under allowance or a streak),
 * once the person has logged at least 5 entries and used the app for 2+ days, and at most every 60 days.
 * The prompt is neutral (no sentiment filtering); feedback lives in Settings.
 */
const K = { first: 'kp.firstOpen', logs: 'kp.logCount', asked: 'kp.reviewAskedAt', done: 'kp.reviewDone' };
export const SUPPORT_EMAIL = 'support@kwikbudget.app';

export async function markOpen() { if (!(await AsyncStorage.getItem(K.first))) await AsyncStorage.setItem(K.first, String(Date.now())); }
export async function countLog() { const n = Number((await AsyncStorage.getItem(K.logs)) ?? 0) + 1; await AsyncStorage.setItem(K.logs, String(n)); return n; }

export async function shouldAsk(win: boolean) {
  if (!win) return false;
  const [first, logs, asked, done] = await Promise.all([K.first, K.logs, K.asked, K.done].map((k) => AsyncStorage.getItem(k)));
  if (done === '1') return false;
  const day = 86400000;
  if (Date.now() - Number(first ?? Date.now()) < 2 * day) return false;
  if (Number(logs ?? 0) < 5) return false;
  if (asked && Date.now() - Number(asked) < 60 * day) return false;
  return true;
}
export async function markAsked() { await AsyncStorage.setItem(K.asked, String(Date.now())); }

export async function openNativeReview() {
  await AsyncStorage.setItem(K.done, '1');
  if (await StoreReview.isAvailableAsync()) return StoreReview.requestReview();
  const url = StoreReview.storeUrl(); if (url) Linking.openURL(url);
}
export function sendFeedback() { Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Kwik%20Budget%20feedback`); }
