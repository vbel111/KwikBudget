import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addDays, daysBetween, defaultSplit, round2, todayStr } from './money';
import type { Bill, PayFrequency } from './types';

export type DraftBill = { key: string; name: string; amount: number; dueIn: number; on: boolean; kind?: 'bill' | 'subscription'; billing?: 'weekly' | 'monthly' | 'yearly' };
export type Split = { savings: number; food: number; transport: number; fun: number; buffer: number };
export type Goal = 'payday' | 'save' | 'bills' | 'track';

type D = {
  goals: Goal[]; frequency: PayFrequency; income: number; paydayOffset: number; bills: DraftBill[];
  split: Split | null; savingsRate: number; planReady: boolean; currency: string;
  setCurrencyCode: (c: string) => void;
  toggleGoal: (g: Goal) => void; setFrequency: (f: PayFrequency) => void;
  setIncome: (n: number) => void; setPayday: (n: number) => void;
  setBill: (k: string, p: Partial<DraftBill>) => void; addBill: () => void; removeBill: (k: string) => void;
  setSavingsRate: (r: number) => void;
  buildSplit: () => void; nudge: (key: keyof Split, delta: number) => void;
  setPlanReady: (v: boolean) => void;
  prefillFrom: (income: number, bills: Bill[], payday: string) => void;
  reset: () => void;
};

const seed: DraftBill[] = [
  { key: 'rent', name: 'Rent', amount: 800, dueIn: 21, on: true }, { key: 'elec', name: 'Electricity', amount: 120, dueIn: 2, on: true },
  { key: 'ins', name: 'Insurance', amount: 82, dueIn: 4, on: true }, { key: 'net', name: 'Internet', amount: 60, dueIn: 6, on: true },
  { key: 'phone', name: 'Phone', amount: 45, dueIn: 7, on: true }, { key: 'gym', name: 'Gym', amount: 29, dueIn: 8, on: false },
  { key: 'stream', name: 'Streaming', amount: 14, dueIn: 8, on: true },
];
export const FREQ_DAYS: Record<PayFrequency, number> = { weekly: 7, biweekly: 14, monthly: 30, irregular: 30 };
const initial = { goals: [] as Goal[], frequency: 'monthly' as PayFrequency, income: 0, paydayOffset: 30, bills: seed, split: null, savingsRate: 0.125, planReady: false, currency: 'USD' };

export const useDraft = create<D>()(persist((set, get) => ({
  ...initial,
  toggleGoal: (g) => { const s = get().goals; set({ goals: s.includes(g) ? s.filter((x) => x !== g) : [...s, g] }); },
  setFrequency: (frequency) => set({ frequency, paydayOffset: FREQ_DAYS[frequency] }),
  setCurrencyCode: (currency) => set({ currency }),
  setIncome: (income) => set({ income }), setPayday: (paydayOffset) => set({ paydayOffset }),
  setBill: (k, p) => set({ bills: get().bills.map((b) => (b.key === k ? { ...b, ...p } : b)) }),
  addBill: () => set({ bills: [...get().bills, { key: 'b' + Date.now(), name: '', amount: 0, dueIn: Math.min(5, get().paydayOffset), on: true }] }),
  removeBill: (k) => set({ bills: get().bills.filter((b) => b.key !== k) }),
  setSavingsRate: (savingsRate) => { set({ savingsRate }); get().buildSplit(); },
  buildSplit: () => {
    const d = get(); const s = defaultSplit(d.income, billsTotal(d.bills, d.paydayOffset), d.savingsRate);
    set({ split: { savings: s.savings, food: s.food, transport: s.transport, fun: s.fun, buffer: s.buffer } });
  },
  // Moves money between a jar and the buffer so the plan always adds up to the income.
  nudge: (key, delta) => {
    const s = get().split; if (!s || key === 'buffer') return;
    const nv = round2(s[key] + delta); const nb = round2(s.buffer - delta);
    if (nv < 0 || nb < 0) return;
    set({ split: { ...s, [key]: nv, buffer: nb } });
  },
  setPlanReady: (planReady) => set({ planReady }),
  prefillFrom: (income, bills, payday) => {
    const freq = get().frequency; const next = addDays(payday, FREQ_DAYS[freq]);
    set({
      income, planReady: false, split: null,
      paydayOffset: Math.max(2, daysBetween(todayStr(), next)),
      bills: bills.filter((b) => b.recurring || b.kind === 'subscription').map((b) => {
        // Subscriptions keep their own rhythm; bills follow the pay rhythm.
        const step = b.kind === 'subscription' ? (b.billing === 'weekly' ? 7 : b.billing === 'yearly' ? 365 : 30) : FREQ_DAYS[freq];
        let due = b.due_date; while (due <= todayStr()) due = addDays(due, step);
        return { key: b.id, name: b.name, amount: b.amount, on: true, dueIn: Math.max(1, daysBetween(todayStr(), due)), kind: b.kind, billing: b.billing };
      }),
    });
  },
  reset: () => set({ ...initial }),
}), { name: 'kp.draft', storage: createJSONStorage(() => AsyncStorage) }));

/** Bills funded from this pay: only those due before payday (later ones carry into the next plan). */
export const billsTotal = (b: DraftBill[], paydayOffset = Infinity) => round2(b.filter((x) => x.on && x.dueIn <= paydayOffset).reduce((s, x) => s + x.amount, 0));
export const paydayStr = (offset: number) => addDays(todayStr(), offset);
