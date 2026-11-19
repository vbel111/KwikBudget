import { addDays, daysBetween, round2, todayStr } from './money';
import { merchantKey, prettyMerchant } from './parser';
import type { Bill, Billing, Tx } from './types';

/*
 * Subscription intelligence, all on-device.
 * Detection works on what people log (and on imported statements): a "subscriptions" category entry,
 * or the same merchant at a similar amount at a regular interval.
 */

export const PER_YEAR: Record<Billing, number> = { weekly: 52, monthly: 12, yearly: 1 };
export const yearlyCost = (b: Pick<Bill, 'amount' | 'billing'>) => round2(b.amount * PER_YEAR[b.billing]);
export const monthlyCost = (b: Pick<Bill, 'amount' | 'billing'>) => round2((b.amount * PER_YEAR[b.billing]) / 12);
export const billingLabel: Record<Billing, string> = { weekly: 'week', monthly: 'month', yearly: 'year' };

export function nextRenewal(from: string, billing: Billing) {
  if (billing === 'weekly') return addDays(from, 7);
  const [y, m, d] = from.split('-').map(Number);
  // Clamp to the last day of the target month (31 Jan → 28/29 Feb, not 3 Mar).
  const ty = billing === 'monthly' ? y + Math.floor(m / 12) : y + 1; const tm = billing === 'monthly' ? m % 12 : m - 1;
  const last = new Date(ty, tm + 1, 0).getDate();
  const dt = new Date(ty, tm, Math.min(d, last));
  const z = (n: number) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${z(dt.getMonth() + 1)}-${z(dt.getDate())}`;
}

export type Candidate = { key: string; merchant: string; amount: number; billing: Billing; lastDate: string; reason: 'category' | 'repeat' };

const tracked = (bills: Bill[]) => new Set(bills.map((b) => merchantKey(b.name)));

/** Merchants that look like subscriptions and are not tracked yet. */
export function detectCandidates(txs: Tx[], bills: Bill[], dismissed: string[] = []): Candidate[] {
  const known = tracked(bills); const skip = new Set(dismissed);
  const groups = new Map<string, Tx[]>();
  for (const t of txs) {
    const k = merchantKey(t.merchant ?? '');
    if (!k || known.has(k) || skip.has(k)) continue;
    groups.set(k, [...(groups.get(k) ?? []), t]);
  }
  const out: Candidate[] = [];
  for (const [k, list] of groups) {
    const sorted = [...list].sort((a, b) => a.occurred_on.localeCompare(b.occurred_on));
    const last = sorted[sorted.length - 1];
    let billing: Billing | null = null;
    for (let i = 1; i < sorted.length; i++) {
      const gap = daysBetween(sorted[i - 1].occurred_on, sorted[i].occurred_on);
      const similar = Math.abs(sorted[i].amount - sorted[i - 1].amount) <= sorted[i - 1].amount * 0.1;
      if (!similar) continue;
      if (gap >= 6 && gap <= 8) billing = 'weekly';
      else if (gap >= 26 && gap <= 35) billing = 'monthly';
      else if (gap >= 350 && gap <= 380) billing = 'yearly';
    }
    if (billing) out.push({ key: k, merchant: prettyMerchant(k), amount: last.amount, billing, lastDate: last.occurred_on, reason: 'repeat' });
    else if (last.category === 'subscriptions') out.push({ key: k, merchant: prettyMerchant(k), amount: last.amount, billing: 'monthly', lastDate: last.occurred_on, reason: 'category' });
  }
  return out.sort((a, b) => b.amount - a.amount);
}

export type PriceChange = { bill: Bill; from: number; to: number };

/** A tracked subscription whose latest charge is higher than what we expected. */
export function priceChanges(bills: Bill[], txs: Tx[]): PriceChange[] {
  const out: PriceChange[] = [];
  for (const b of bills.filter((x) => x.kind === 'subscription')) {
    const k = merchantKey(b.name);
    const latest = txs.filter((t) => merchantKey(t.merchant ?? '') === k).sort((x, y) => y.occurred_on.localeCompare(x.occurred_on))[0];
    if (latest && latest.amount > b.amount * 1.02) out.push({ bill: b, from: b.amount, to: latest.amount });
    else if (b.prev_amount != null && b.amount > b.prev_amount * 1.02) out.push({ bill: b, from: b.prev_amount, to: b.amount });
  }
  return out;
}

export const trialEndsIn = (b: Bill, now = todayStr()) => (b.trial_ends ? daysBetween(now, b.trial_ends) : null);
