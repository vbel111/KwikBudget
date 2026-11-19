import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * RevenueCat wrapper.
 * - Set EXPO_PUBLIC_RC_IOS_KEY / EXPO_PUBLIC_RC_ANDROID_KEY and create an entitlement called "pro"
 *   with a current offering that has a monthly and an annual package (annual with a 7-day free trial).
 * - Without keys (or in Expo Go, where the native module is missing) it runs in demo mode so the
 *   paywall can be designed and tested; demo purchases only unlock Pro on this device.
 */
export const ENTITLEMENT = 'pro';
export type Plan = {
  id: 'annual' | 'monthly'; title: string; price: string; perMonth: string | null; trialDays: number | null; pkg: unknown;
};
/** Shown only in demo mode. Real prices always come from the store via RevenueCat. */
const DEMO_PLANS: Plan[] = [
  { id: 'annual', title: 'Yearly', price: '$29.99', perMonth: '$2.50', trialDays: 7, pkg: null },
  { id: 'monthly', title: 'Monthly', price: '$4.99', perMonth: null, trialDays: null, pkg: null },
];
const DEMO_KEY = 'kp.demoPro';

let RC: any = null;
let ready = false;
const key = Platform.OS === 'ios' ? process.env.EXPO_PUBLIC_RC_IOS_KEY : process.env.EXPO_PUBLIC_RC_ANDROID_KEY;
const isExpoGo = Constants.executionEnvironment === 'storeClient';

export const purchasesLive = () => ready;

export async function initPurchases(userId?: string) {
  if (ready || !key || isExpoGo) return;
  try {
    RC = require('react-native-purchases').default;
    RC.configure({ apiKey: key, appUserID: userId });
    ready = true;
  } catch { ready = false; }
}

export async function identify(userId: string) { if (ready) { try { await RC.logIn(userId); } catch {} } }
export async function resetIdentity() { if (ready) { try { await RC.logOut(); } catch {} } }

export async function isPro(): Promise<boolean> {
  if (!ready) return (await AsyncStorage.getItem(DEMO_KEY)) === '1';
  try { const info = await RC.getCustomerInfo(); return !!info.entitlements.active[ENTITLEMENT]; } catch { return false; }
}

export function onProChange(cb: (pro: boolean) => void) {
  if (!ready) return () => {};
  const l = (info: any) => cb(!!info.entitlements.active[ENTITLEMENT]);
  RC.addCustomerInfoUpdateListener(l);
  return () => RC.removeCustomerInfoUpdateListener(l);
}

export async function getPlans(): Promise<Plan[]> {
  if (!ready) return DEMO_PLANS;
  try {
    const o = await RC.getOfferings();
    const pk: any[] = o.current?.availablePackages ?? [];
    const plans: Plan[] = [];
    const annual = pk.find((p) => p.packageType === 'ANNUAL');
    const monthly = pk.find((p) => p.packageType === 'MONTHLY');
    if (annual) {
      const intro = annual.product.introPrice;
      plans.push({
        id: 'annual', title: 'Yearly', price: annual.product.priceString,
        perMonth: annual.product.pricePerMonthString ?? null,
        trialDays: intro && intro.price === 0 ? trialDays(intro.periodUnit, intro.periodNumberOfUnits) : null, pkg: annual,
      });
    }
    if (monthly) plans.push({ id: 'monthly', title: 'Monthly', price: monthly.product.priceString, perMonth: null, trialDays: null, pkg: monthly });
    return plans.length ? plans : DEMO_PLANS;
  } catch { return DEMO_PLANS; }
}

const trialDays = (unit: string, n: number) => (unit === 'WEEK' ? 7 * n : unit === 'MONTH' ? 30 * n : n);

export async function buy(plan: Plan): Promise<'ok' | 'cancelled' | 'error'> {
  if (!ready || !plan.pkg) { await AsyncStorage.setItem(DEMO_KEY, '1'); return 'ok'; }
  try {
    const { customerInfo } = await RC.purchasePackage(plan.pkg);
    return customerInfo.entitlements.active[ENTITLEMENT] ? 'ok' : 'error';
  } catch (e: any) { return e?.userCancelled ? 'cancelled' : 'error'; }
}

export async function restore(): Promise<boolean> {
  if (!ready) return (await AsyncStorage.getItem(DEMO_KEY)) === '1';
  try { const info = await RC.restorePurchases(); return !!info.entitlements.active[ENTITLEMENT]; } catch { return false; }
}

export const manageUrl = Platform.OS === 'ios' ? 'https://apps.apple.com/account/subscriptions' : 'https://play.google.com/store/account/subscriptions';
