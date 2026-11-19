import { useDraft, billsTotal } from './draft';
import { useStore } from './store';
import { addDays, todayStr } from './money';

let busy = false;

/** Turns the onboarding draft into a real cycle on Supabase. Safe to call more than once. */
export async function commitDraft(): Promise<boolean> {
  if (busy) return false;
  const d = useDraft.getState(); const s = d.split;
  if (!s || !d.planReady) return false;
  busy = true;
  try {
    const t = todayStr(); const bills = billsTotal(d.bills, d.paydayOffset);
    const store = useStore.getState();
    await store.saveProfile({ goals: d.goals, pay_frequency: d.frequency, currency: d.currency });
    const ok = await store.createCycle(d.income, addDays(t, d.paydayOffset),
      d.bills.filter((b) => b.on && b.amount > 0 && b.name.trim()).map((b) => ({ name: b.name.trim(), amount: b.amount, due_date: addDays(t, b.dueIn), recurring: true, kind: b.kind ?? 'bill', billing: b.billing ?? 'monthly' })),
      [
        { key: 'bills', name: 'Bills', budget: bills, locked: true }, { key: 'savings', name: 'Savings', budget: s.savings, locked: true },
        { key: 'food', name: 'Food', budget: s.food, locked: false }, { key: 'transport', name: 'Transport', budget: s.transport, locked: false },
        { key: 'fun', name: 'Fun', budget: s.fun, locked: false }, { key: 'buffer', name: 'Buffer', budget: s.buffer, locked: false },
      ]);
    if (ok) d.setPlanReady(false);
    return ok;
  } finally { busy = false; }
}
