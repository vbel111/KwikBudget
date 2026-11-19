import type { Bill, Cycle, Income, Jar, Move, Tx } from './types';

/* ---------- dates ---------- */
export const todayStr = (d = new Date()) => {
  const z = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
};
export const parseDay = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (s: string, n: number) => { const d = parseDay(s); d.setDate(d.getDate() + n); return todayStr(d); };
export const daysBetween = (a: string, b: string) => Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / 86400000);
export const fmtDay = (s: string) => parseDay(s).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
export const fmtLong = (s: string) => parseDay(s).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
export const fmtRelative = (s: string, now = todayStr()) => {
  const d = daysBetween(now, s);
  if (d === 0) return 'Today'; if (d === -1) return 'Yesterday'; if (d === 1) return 'Tomorrow';
  if (d > 1 && d < 7) return `In ${d} days`;
  return fmtLong(s);
};

/* ---------- currency ---------- */
export const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US dollar' }, { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British pound' }, { code: 'CAD', symbol: 'CA$', name: 'Canadian dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian dollar' }, { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian cedi' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian naira' }, { code: 'KES', symbol: 'KSh', name: 'Kenyan shilling' },
  { code: 'ZAR', symbol: 'R', name: 'South African rand' }, { code: 'INR', symbol: '₹', name: 'Indian rupee' },
];
let SYMBOL = '$';
export const setCurrency = (code: string) => { SYMBOL = CURRENCIES.find((c) => c.code === code)?.symbol ?? '$'; };
export const currencySymbol = () => SYMBOL;

export const round2 = (n: number) => Math.round(n * 100) / 100;
export const money = (n: number, decimals = 2) =>
  (n < 0 ? '-' : '') + SYMBOL + Math.abs(n).toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
/** Drop cents when they are zero: $450 rather than $450.00. */
export const moneyShort = (n: number) => money(n, Math.abs(n % 1) > 0.004 ? 2 : 0);

/* ---------- the allowance engine ---------- */
export type Snapshot = {
  daysLeft: number; spendable: number; spentToday: number; allowance: number; leftToday: number;
  jarLeft: Record<string, number>; jarSpent: Record<string, number>; billsDue: number; extraIncome: number;
};

export function snapshot(cycle: Cycle, jars: Jar[], txs: Tx[], moves: Move[], bills: Bill[], incomes: Income[] = [], now = todayStr()): Snapshot {
  const daysLeft = Math.max(1, daysBetween(now, cycle.payday));
  const jarSpent: Record<string, number> = {}; const jarLeft: Record<string, number> = {};
  for (const t of txs) jarSpent[t.jar_id] = (jarSpent[t.jar_id] ?? 0) + t.amount;
  for (const j of jars) {
    const inn = moves.filter((m) => m.to_jar === j.id).reduce((s, m) => s + m.amount, 0)
      + incomes.filter((i) => i.jar_id === j.id).reduce((s, i) => s + i.amount, 0);
    const out = moves.filter((m) => m.from_jar === j.id).reduce((s, m) => s + m.amount, 0);
    jarLeft[j.id] = round2(j.budget + inn - out - (jarSpent[j.id] ?? 0));
  }
  const open = jars.filter((j) => !j.locked);
  const ids = new Set(open.map((j) => j.id));
  const spendable = round2(open.reduce((s, j) => s + jarLeft[j.id], 0));
  const spentToday = round2(txs.filter((t) => t.occurred_on === now && ids.has(t.jar_id)).reduce((s, t) => s + t.amount, 0));
  // Today's allowance is fixed at the start of the day: everything spendable (plus what was already spent today) spread over the days left.
  const allowance = round2(Math.max(0, spendable + spentToday) / daysLeft);
  const billsDue = round2(bills.filter((b) => !b.paid && b.due_date <= cycle.payday).reduce((s, b) => s + b.amount, 0));
  const extraIncome = round2(incomes.reduce((s, i) => s + i.amount, 0));
  return { daysLeft, spendable, spentToday, allowance, leftToday: round2(allowance - spentToday), jarLeft, jarSpent, billsDue, extraIncome };
}

/** Default payday split: bills first, 12.5% savings, then food/transport/fun/buffer. */
export function defaultSplit(income: number, bills: number, savingsRate = 0.125) {
  const savings = round2(income * savingsRate);
  const rest = Math.max(0, income - bills - savings);
  const food = round2(rest * 0.2727), transport = round2(rest * 0.097), fun = round2(rest * 0.1455);
  const buffer = round2(rest - food - transport - fun);
  return { bills, savings, food, transport, fun, buffer };
}

/* ---------- insights ---------- */
export function dailyLimit(cycle: Cycle, jars: Jar[]) {
  const total = jars.filter((j) => !j.locked).reduce((s, j) => s + j.budget, 0);
  return round2(total / Math.max(1, daysBetween(cycle.start_date, cycle.payday)));
}

export function weekReview(cycle: Cycle, jars: Jar[], txs: Tx[], now = todayStr()) {
  const open = new Set(jars.filter((j) => !j.locked).map((j) => j.id));
  const limit = dailyLimit(cycle, jars);
  const days = Array.from({ length: 7 }, (_, i) => addDays(now, i - 6)).map((d) => {
    const spent = round2(txs.filter((t) => t.occurred_on === d && open.has(t.jar_id)).reduce((s, t) => s + t.amount, 0));
    const inCycle = d >= cycle.start_date;
    return { day: d, spent, under: spent <= limit, inCycle };
  });
  const tracked = days.filter((d) => d.inCycle);
  const under = tracked.filter((d) => d.under).length;
  const rolled = round2(tracked.reduce((s, d) => s + Math.max(0, limit - d.spent), 0));
  let streak = 0; for (let i = days.length - 1; i >= 0 && days[i].inCycle && days[i].under; i--) streak++;
  return { days, limit, under, tracked: tracked.length, rolled, streak };
}

export function categoryTotals(txs: Tx[]) {
  const m: Record<string, number> = {};
  for (const t of txs) m[t.category] = round2((m[t.category] ?? 0) + t.amount);
  return Object.entries(m).map(([key, total]) => ({ key, total })).sort((a, b) => b.total - a.total);
}

/** Where you will land on payday if you keep spending at your average pace. */
export function projection(cycle: Cycle, jars: Jar[], txs: Tx[], snap: Snapshot, now = todayStr()) {
  const open = new Set(jars.filter((j) => !j.locked).map((j) => j.id));
  const elapsed = Math.max(1, daysBetween(cycle.start_date, now) + 1);
  const spent = txs.filter((t) => open.has(t.jar_id)).reduce((s, t) => s + t.amount, 0);
  const avg = round2(spent / elapsed);
  const endBalance = round2(snap.spendable + snap.spentToday - avg * snap.daysLeft);
  return { avg, endBalance, onTrack: endBalance >= 0 };
}

export function groupByDay<T extends { occurred_on: string }>(rows: T[]) {
  const out: { day: string; rows: T[] }[] = [];
  for (const r of rows) {
    const g = out.find((x) => x.day === r.occurred_on);
    if (g) g.rows.push(r); else out.push({ day: r.occurred_on, rows: [r] });
  }
  return out.sort((a, b) => b.day.localeCompare(a.day));
}
