import { create } from 'zustand';
import { supabase, supabaseConfigured } from './supabase';
import { round2, setCurrency, todayStr } from './money';
import { identify, initPurchases, isPro, onProChange, resetIdentity } from './purchases';
import type { Bill, BillKind, Billing, Cycle, Income, Jar, JarKey, MerchantRule, Move, Profile, Tx } from './types';
import type { Memory } from './parser';
import { merchantKey } from './parser';

export type Toast = { id: number; text: string; action?: { label: string; run: () => void }; tone?: 'ok' | 'error' };

type NewTx = { jarId: string; amount: number; merchant: string; category: string; date?: string; note?: string | null };

type State = {
  ready: boolean; loaded: boolean; signedIn: boolean; userId: string | null; email: string;
  /** True for the silent account created at the end of onboarding (no email yet). */
  isAnonymous: boolean;
  profile: Profile; cycle: Cycle | null; bills: Bill[]; jars: Jar[]; txs: Tx[]; moves: Move[]; incomes: Income[];
  pro: boolean; toast: Toast | null; ratingPrompt: boolean;

  boot: () => Promise<void>;
  startAnonymous: () => Promise<boolean>;
  backUp: (email: string, password: string) => Promise<'done' | 'confirm' | 'error'>;
  load: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<boolean>;
  saveProfile: (p: Partial<Profile>) => Promise<void>;
  createCycle: (income: number, payday: string, bills: { name: string; amount: number; due_date: string; recurring: boolean; kind?: string; billing?: string }[], jars: Omit<Jar, 'id'>[]) => Promise<boolean>;
  addTx: (t: NewTx) => Promise<Tx | null>;
  addTxBatch: (rows: NewTx[]) => Promise<number>;
  updateTx: (id: string, patch: Partial<Pick<Tx, 'amount' | 'merchant' | 'category' | 'jar_id' | 'occurred_on' | 'note'>>) => Promise<boolean>;
  deleteTx: (id: string) => void;
  addIncome: (jarId: string, amount: number, note: string) => Promise<boolean>;
  setBillPaid: (billId: string, paid: boolean) => Promise<boolean>;
  addBill: (name: string, amount: number, due: string, opts?: { kind?: BillKind; billing?: Billing; trial_ends?: string | null }) => Promise<boolean>;
  updateBill: (id: string, patch: Partial<Pick<Bill, 'name' | 'amount' | 'due_date' | 'kind' | 'billing' | 'trial_ends' | 'prev_amount'>>) => Promise<boolean>;
  /** Merchant memory learned from the person's own choices. */
  memory: Memory;
  learn: (merchant: string, category: string, jarKey: JarKey) => void;
  deleteBill: (id: string) => Promise<boolean>;
  setJarBudget: (id: string, budget: number) => Promise<boolean>;
  moveMoney: (from: string, to: string, amount: number) => Promise<boolean>;
  setPro: (pro: boolean) => void;
  showToast: (text: string, opts?: { action?: Toast['action']; tone?: Toast['tone'] }) => void;
  hideToast: () => void;
  setRatingPrompt: (v: boolean) => void;
};

const nums = <T,>(o: any, keys: string[]): T => { const r: any = { ...o }; keys.forEach((k) => (r[k] = Number(r[k]))); return r as T; };
const ORDER = ['bills', 'savings', 'food', 'transport', 'fun', 'buffer'];
const EMPTY = { cycle: null, bills: [], jars: [], txs: [], moves: [], incomes: [] };
const pendingDeletes = new Map<string, ReturnType<typeof setTimeout>>();
let toastSeq = 1;

export const useStore = create<State>((set, get) => {
  const fail = (msg: string) => { get().showToast(friendly(msg), { tone: 'error' }); return false as const; };

  return {
    ready: false, loaded: false, signedIn: false, userId: null, email: '', isAnonymous: false,
    profile: { name: '', currency: 'USD', goals: [], pay_frequency: 'monthly' },
    ...EMPTY, memory: {}, pro: false, toast: null, ratingPrompt: false,

    boot: async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id ?? null;
      await initPurchases(uid ?? undefined);
      onProChange((pro) => set({ pro }));
      set({ signedIn: !!data.session, userId: uid, email: data.session?.user.email ?? '', isAnonymous: !!data.session?.user.is_anonymous });
      supabase.auth.onAuthStateChange((event, session) => {
        const was = get().userId;
        set({ signedIn: !!session, userId: session?.user.id ?? null, email: session?.user.email ?? '', isAnonymous: !!session?.user.is_anonymous });
        if (session && session.user.id !== was) { identify(session.user.id); get().load(); }
        if (!session) { resetIdentity(); set({ ...EMPTY, memory: {}, loaded: false }); }
        if (event === 'TOKEN_REFRESHED') return;
      });
      if (data.session) await get().load();
      set({ pro: await isPro(), ready: true });
    },

    // Silent account: no email or password. Everything saves to Supabase under this user id,
    // and backUp() later turns the same account into a normal one, keeping all data.
    startAnonymous: async () => {
      if (!supabaseConfigured) return fail('not configured');
      const { error } = await supabase.auth.signInAnonymously();
      if (error) return fail(/anonymous/i.test(error.message) ? 'Turn on Anonymous sign-ins in Supabase (Authentication > Sign In / Providers).' : error.message);
      return true;
    },

    backUp: async (email, password) => {
      // Supabase flow for converting an anonymous user: set the email, then the password.
      const r1 = await supabase.auth.updateUser({ email });
      if (r1.error) { fail(r1.error.message); return 'error'; }
      if (r1.data.user?.email !== email) return 'confirm'; // email confirmation is on: finish after tapping the link
      const r2 = await supabase.auth.updateUser({ password });
      if (r2.error) { fail(r2.error.message); return 'error'; }
      set({ email, isAnonymous: false });
      return 'done';
    },

    load: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const [{ data: prof }, { data: cycle, error }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', u.user.id).maybeSingle(),
        supabase.from('cycles').select('*').eq('active', true).maybeSingle(),
      ]);
      supabase.from('merchant_rules').select('merchant_key,category,jar_key').then(({ data }) => {
        if (data) set({ memory: Object.fromEntries((data as MerchantRule[]).map((r) => [r.merchant_key, r])) });
      });
      if (prof) {
        setCurrency(prof.currency ?? 'USD');
        set({ profile: { name: prof.name ?? '', currency: prof.currency ?? 'USD', goals: prof.goals ?? [], pay_frequency: prof.pay_frequency ?? 'monthly' } });
      }
      if (error) { fail(error.message); set({ loaded: true }); return; }
      if (!cycle) { set({ ...EMPTY, loaded: true }); return; }
      const [b, j, t, m, inc] = await Promise.all([
        supabase.from('bills').select('*').eq('cycle_id', cycle.id).order('due_date'),
        supabase.from('jars').select('*').eq('cycle_id', cycle.id),
        supabase.from('transactions').select('*').eq('cycle_id', cycle.id).order('occurred_on', { ascending: false }).order('created_at', { ascending: false }),
        supabase.from('jar_moves').select('*').eq('cycle_id', cycle.id),
        supabase.from('incomes').select('*').eq('cycle_id', cycle.id),
      ]);
      set({
        cycle: nums<Cycle>(cycle, ['income']),
        bills: (b.data ?? []).map((x) => ({ ...nums<Bill>(x, ['amount']), prev_amount: x.prev_amount == null ? null : Number(x.prev_amount) })),
        jars: (j.data ?? []).map((x) => nums<Jar>(x, ['budget'])).sort((x, y) => ORDER.indexOf(x.key) - ORDER.indexOf(y.key)),
        txs: (t.data ?? []).map((x) => nums<Tx>(x, ['amount'])),
        moves: (m.data ?? []).map((x) => nums<Move>(x, ['amount'])),
        incomes: (inc.data ?? []).map((x) => nums<Income>(x, ['amount'])),
        loaded: true,
      });
    },

    signOut: async () => { await supabase.auth.signOut(); },

    deleteAccount: async () => {
      const { error } = await supabase.rpc('delete_account');
      if (error) return fail(error.message);
      await supabase.auth.signOut();
      return true;
    },

    saveProfile: async (p) => {
      const next = { ...get().profile, ...p };
      if (p.currency) setCurrency(p.currency);
      set({ profile: next });
      const id = get().userId; if (!id) return;
      const { error } = await supabase.from('profiles').upsert({ id, ...next });
      if (error) fail(error.message);
    },

    createCycle: async (income, payday, bills, jars) => {
      const { error } = await supabase.rpc('create_cycle', { p_income: income, p_payday: payday, p_bills: bills, p_jars: jars });
      if (error) return fail(error.message);
      await get().load();
      return true;
    },

    addTx: async ({ jarId, amount, merchant, category, date, note }) => {
      const cycle = get().cycle; if (!cycle) return null;
      const tmp: Tx = { id: 'tmp-' + Date.now(), jar_id: jarId, amount: round2(amount), merchant, category, note: note ?? null, occurred_on: date ?? todayStr(), created_at: new Date().toISOString() };
      set({ txs: [tmp, ...get().txs] });
      const { data, error } = await supabase.from('transactions')
        .insert({ cycle_id: cycle.id, jar_id: jarId, amount: tmp.amount, merchant, category, note: tmp.note, occurred_on: tmp.occurred_on }).select().single();
      if (error) { set({ txs: get().txs.filter((x) => x.id !== tmp.id) }); fail(error.message); return null; }
      const real = nums<Tx>(data, ['amount']);
      set({ txs: get().txs.map((x) => (x.id === tmp.id ? real : x)) });
      return real;
    },

    // Used by statement import: one insert for many rows.
    addTxBatch: async (rows) => {
      const cycle = get().cycle; if (!cycle || !rows.length) return 0;
      const payload = rows.map((r) => ({ cycle_id: cycle.id, jar_id: r.jarId, amount: round2(r.amount), merchant: r.merchant, category: r.category, note: r.note ?? null, occurred_on: r.date ?? todayStr() }));
      const { data, error } = await supabase.from('transactions').insert(payload).select();
      if (error) { fail(error.message); return 0; }
      const added = (data ?? []).map((x) => nums<Tx>(x, ['amount']));
      set({ txs: [...added, ...get().txs].sort((a, b) => b.occurred_on.localeCompare(a.occurred_on) || b.created_at.localeCompare(a.created_at)) });
      return added.length;
    },

    updateTx: async (id, patch) => {
      const prev = get().txs;
      set({ txs: prev.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
      const { error } = await supabase.from('transactions').update(patch).eq('id', id);
      if (error) { set({ txs: prev }); return fail(error.message); }
      return true;
    },

    // Optimistic delete with a 4 second undo window before anything hits the server.
    deleteTx: (id) => {
      const tx = get().txs.find((t) => t.id === id); if (!tx) return;
      set({ txs: get().txs.filter((t) => t.id !== id) });
      const timer = setTimeout(async () => {
        pendingDeletes.delete(id);
        const { error } = await supabase.from('transactions').delete().eq('id', id);
        if (error) { set({ txs: [tx, ...get().txs] }); fail(error.message); }
      }, 4000);
      pendingDeletes.set(id, timer);
      get().showToast(`Deleted ${tx.merchant ?? 'entry'}`, {
        action: { label: 'Undo', run: () => { clearTimeout(pendingDeletes.get(id)); pendingDeletes.delete(id); set({ txs: [tx, ...get().txs].sort((a, b) => b.occurred_on.localeCompare(a.occurred_on) || b.created_at.localeCompare(a.created_at)) }); } },
      });
    },

    addIncome: async (jarId, amount, note) => {
      const cycle = get().cycle; if (!cycle) return false;
      const { data, error } = await supabase.from('incomes').insert({ cycle_id: cycle.id, jar_id: jarId, amount: round2(amount), note }).select().single();
      if (error) return fail(error.message);
      set({ incomes: [...get().incomes, nums<Income>(data, ['amount'])] });
      return true;
    },

    setBillPaid: async (billId, paid) => {
      const prev = get().bills;
      set({ bills: prev.map((b) => (b.id === billId ? { ...b, paid } : b)) });
      const { error } = await supabase.from('bills').update({ paid }).eq('id', billId);
      if (error) { set({ bills: prev }); return fail(error.message); }
      return true;
    },

    addBill: async (name, amount, due, opts) => {
      const cycle = get().cycle; if (!cycle) return false;
      const row = { cycle_id: cycle.id, name, amount, due_date: due, kind: opts?.kind ?? 'bill', billing: opts?.billing ?? 'monthly', trial_ends: opts?.trial_ends ?? null };
      const { data, error } = await supabase.from('bills').insert(row).select().single();
      if (error) return fail(error.message);
      // Bills due before payday are funded from the buffer so the plan stays balanced.
      // Ones after payday are just remembered and carried into the next plan.
      if (due <= cycle.payday) {
        const bills = get().jars.find((j) => j.key === 'bills'); const buffer = get().jars.find((j) => j.key === 'buffer');
        if (bills && buffer) await get().moveMoney(buffer.id, bills.id, amount);
      }
      set({ bills: [...get().bills, { ...nums<Bill>(data, ['amount']), prev_amount: null }].sort((a, b) => a.due_date.localeCompare(b.due_date)) });
      return true;
    },

    updateBill: async (id, patch) => {
      const prev = get().bills;
      set({ bills: prev.map((b) => (b.id === id ? { ...b, ...patch } : b)) });
      const { error } = await supabase.from('bills').update(patch).eq('id', id);
      if (error) { set({ bills: prev }); return fail(error.message); }
      return true;
    },

    learn: (merchant, category, jarKey) => {
      const key = merchantKey(merchant);
      if (!key || key.length < 2 || !['food', 'transport', 'fun', 'buffer'].includes(jarKey)) return;
      const cur = get().memory[key];
      if (cur && cur.category === category && cur.jar_key === jarKey) return;
      const rule: MerchantRule = { merchant_key: key, category, jar_key: jarKey };
      set({ memory: { ...get().memory, [key]: rule } });
      supabase.from('merchant_rules').upsert({ ...rule, updated_at: new Date().toISOString() }).then(() => {});
    },

    deleteBill: async (id) => {
      const prev = get().bills;
      set({ bills: prev.filter((b) => b.id !== id) });
      const { error } = await supabase.from('bills').delete().eq('id', id);
      if (error) { set({ bills: prev }); return fail(error.message); }
      return true;
    },

    setJarBudget: async (id, budget) => {
      const prev = get().jars;
      set({ jars: prev.map((j) => (j.id === id ? { ...j, budget: round2(budget) } : j)) });
      const { error } = await supabase.from('jars').update({ budget: round2(budget) }).eq('id', id);
      if (error) { set({ jars: prev }); return fail(error.message); }
      return true;
    },

    moveMoney: async (from, to, amount) => {
      const cycle = get().cycle; if (!cycle) return false;
      const tmp: Move = { id: 'tmp-' + Date.now(), from_jar: from, to_jar: to, amount: round2(amount) };
      set({ moves: [...get().moves, tmp] });
      const { data, error } = await supabase.from('jar_moves').insert({ cycle_id: cycle.id, from_jar: from, to_jar: to, amount: tmp.amount }).select().single();
      if (error) { set({ moves: get().moves.filter((m) => m.id !== tmp.id) }); return fail(error.message); }
      set({ moves: get().moves.map((m) => (m.id === tmp.id ? nums<Move>(data, ['amount']) : m)) });
      return true;
    },

    setPro: (pro) => set({ pro }),
    showToast: (text, opts) => set({ toast: { id: toastSeq++, text, ...opts } }),
    hideToast: () => set({ toast: null }),
    setRatingPrompt: (ratingPrompt) => set({ ratingPrompt }),
  };
});

function friendly(msg: string) {
  if (__DEV__) console.warn('[Kwik Budget] Supabase error:', msg);
  if (!supabaseConfigured) return 'Supabase is not set up: check .env.local, then restart with npx expo start -c.';
  // While developing, show the real message so problems are easy to track down.
  if (/network|fetch/i.test(msg)) return __DEV__ ? `Can't reach Supabase (${msg}). Check your internet, then restart with npx expo start -c.` : 'You look offline. Try again in a moment.';
  if (/JWT|session/i.test(msg)) return 'Your session expired. Please sign in again.';
  return msg;
}
