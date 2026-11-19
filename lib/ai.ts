import { supabase } from './supabase';
import { todayStr } from './money';
import { useStore } from './store';

/*
 * Client for the Kwik AI edge function. Nothing secret lives in the app: the AI key stays on the server,
 * and the server checks the person's plan and daily limits before calling the model.
 */

export type AiEntry = { kind: 'spend' | 'income' | 'bill_paid' | 'unknown'; amount?: number; merchant?: string; category?: string; days_ago?: number; note?: string; bill_name?: string };
export type StatementRow = { date: string; merchant: string; description?: string; amount: number; direction: 'out' | 'in'; category: string; recurring?: boolean; transfer?: boolean };
export type Receipt = { merchant: string; total: number; date?: string; category: string; readable?: boolean };
export type Usage = Record<'chat' | 'statement' | 'receipt', { left: number; limit: number; scope: 'daily' | 'lifetime' }>;

export type AiResult<T> = { ok: true; data: T; left: number } | { ok: false; reason: 'limit' | 'offline' | 'setup' | 'error'; message?: string };

async function call<T>(action: string, payload: Record<string, unknown>): Promise<AiResult<T>> {
  const s = useStore.getState();
  const { data, error } = await supabase.functions.invoke('ai', {
    body: { action, today: todayStr(), currency: s.profile.currency, demoPro: s.pro, ...payload },
  });
  if (error) {
    // supabase-js wraps non-2xx responses; read the server's JSON to tell limits from real failures.
    const ctx = (error as any).context;
    let body: any = null;
    try { body = ctx && typeof ctx.json === 'function' ? await ctx.json() : null; } catch {}
    if (body?.error === 'limit') return { ok: false, reason: 'limit' };
    if (/Failed to send|fetch|network/i.test(error.message)) return { ok: false, reason: 'offline' };
    if (/not found|404/i.test(error.message) || ctx?.status === 404) return { ok: false, reason: 'setup', message: 'Kwik AI is not deployed yet (supabase/functions/ai).' };
    return { ok: false, reason: 'error', message: body?.message ?? error.message };
  }
  return { ok: true, data: data.result as T, left: data.left };
}

export const aiParse = (text: string, bills: string[]) => call<{ entries: AiEntry[] }>('parse', { text, bills });
export const aiStatement = (file: { mime: string; base64?: string; text?: string }) => call<{ rows: StatementRow[]; currency?: string }>('statement', { file });
export const aiReceipt = (image: string, mime = 'image/jpeg') => call<Receipt>('receipt', { image, mime });

export async function aiUsage(): Promise<{ pro: boolean; usage: Usage } | null> {
  const s = useStore.getState();
  const { data, error } = await supabase.functions.invoke('ai', { body: { action: 'usage', demoPro: s.pro } });
  return error ? null : data;
}
