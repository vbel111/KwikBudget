// Kwik AI — Supabase Edge Function (Deno).
// Actions: "parse" (chat fallback), "statement" (CSV/PDF/text → rows), "receipt" (photo → entry), "usage" (limits left).
//
// Secrets (Supabase > Edge Functions > Secrets):
//   GEMINI_API_KEY           required (Google AI Studio > Get API key)
//   AI_MODEL                 optional, fast model for chat and receipts (default gemini-3.5-flash-lite)
//   AI_MODEL_STATEMENT       optional, stronger model for statements (default gemini-3.8-flash)
//   REVENUECAT_SECRET_KEY    optional, verifies Pro on the server (recommended for release)
//   ALLOW_DEMO_PRO           optional "true" while testing without RevenueCat: trusts the app's demo Pro flag
// SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are provided automatically.

import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const CATEGORIES: Record<string, string> = {
  groceries: 'supermarket, market, food shopping', dining: 'restaurants, takeaway, lunch, chop bars, snacks', coffee: 'coffee, tea, drinks at cafes',
  rides: 'Uber, Bolt, taxi', transit: 'bus, trotro, train, metro, fares', fuel: 'fuel, parking, tolls',
  entertainment: 'going out, bars, cinema, events, betting', shopping: 'clothes, online shopping, gifts', subscriptions: 'Netflix, Spotify, apps, recurring digital services',
  health: 'pharmacy, doctor, gym', personal: 'hair, beauty, laundry', other: 'anything else, transfers, fees',
};
const CAT_KEYS = Object.keys(CATEGORIES);

// Free gets a taste; Pro gets generous fair-use limits.
const LIMITS = {
  free: { chat: { daily: 3 }, statement: { lifetime: 1 }, receipt: { lifetime: 2 } },
  pro: { chat: { daily: 200 }, statement: { daily: 10 }, receipt: { daily: 40 } },
} as const;
type Feature = 'chat' | 'statement' | 'receipt';
const FEATURE: Record<string, Feature> = { parse: 'chat', statement: 'statement', receipt: 'receipt' };

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

async function isPro(userId: string, demoPro: boolean) {
  const rc = Deno.env.get('REVENUECAT_SECRET_KEY');
  if (!rc) return Deno.env.get('ALLOW_DEMO_PRO') === 'true' && demoPro;
  try {
    const r = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, { headers: { Authorization: `Bearer ${rc}` } });
    if (!r.ok) return false;
    const ent = (await r.json())?.subscriber?.entitlements?.pro;
    return !!ent && (!ent.expires_date || new Date(ent.expires_date) > new Date());
  } catch { return false; }
}

async function used(userId: string, feature: Feature, scope: 'daily' | 'lifetime') {
  let q = admin.from('ai_usage').select('count').eq('user_id', userId).eq('feature', feature);
  if (scope === 'daily') q = q.eq('day', new Date().toISOString().slice(0, 10));
  const { data } = await q;
  return (data ?? []).reduce((s: number, r: { count: number }) => s + r.count, 0);
}

async function remaining(userId: string, pro: boolean) {
  const plan = pro ? LIMITS.pro : LIMITS.free;
  const out: Record<string, { left: number; limit: number; scope: string }> = {};
  for (const f of ['chat', 'statement', 'receipt'] as Feature[]) {
    const rule = plan[f] as { daily?: number; lifetime?: number };
    const scope = rule.daily != null ? 'daily' : 'lifetime';
    const limit = (rule.daily ?? rule.lifetime)!;
    out[f] = { left: Math.max(0, limit - (await used(userId, f, scope))), limit, scope };
  }
  return out;
}

/** Gemini generateContent with a JSON Schema, so the reply is always valid JSON in the shape we expect. */
async function gemini(system: string, parts: unknown[], schema: unknown, model: string, maxTokens = 2000) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': Deno.env.get('GEMINI_API_KEY')!, 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts }],
      generationConfig: { responseMimeType: 'application/json', responseJsonSchema: schema, maxOutputTokens: maxTokens, temperature: 0.1 },
    }),
  });
  if (!r.ok) throw new Error(`AI ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const data = await r.json();
  const text = (data.candidates?.[0]?.content?.parts ?? []).filter((p: { thought?: boolean }) => !p.thought).map((p: { text?: string }) => p.text ?? '').join('');
  if (!text) throw new Error(`AI returned no result${data.promptFeedback?.blockReason ? ` (${data.promptFeedback.blockReason})` : ''}`);
  return JSON.parse(text);
}
const FAST = () => Deno.env.get('AI_MODEL') ?? 'gemini-3.5-flash-lite';
const STRONG = () => Deno.env.get('AI_MODEL_STATEMENT') ?? 'gemini-3.8-flash';

const catList = CAT_KEYS.map((k) => `- ${k}: ${CATEGORIES[k]}`).join('\n');

const ENTRY_SCHEMA = {
    type: 'object', required: ['entries'],
    properties: {
      entries: {
        type: 'array', items: {
          type: 'object', required: ['kind'],
          properties: {
            kind: { type: 'string', enum: ['spend', 'income', 'bill_paid', 'unknown'] },
            amount: { type: 'number', description: 'Amount the person personally paid or received, in their currency' },
            merchant: { type: 'string', description: 'Short merchant or item name, Title Case' },
            category: { type: 'string', enum: CAT_KEYS },
            days_ago: { type: 'integer', minimum: 0, maximum: 60 },
            note: { type: 'string', description: 'Optional short note, e.g. "Your share of 60"' },
            bill_name: { type: 'string', description: 'For bill_paid: which of the listed bills' },
          },
        },
      },
    },
};

const STATEMENT_SCHEMA = {
    type: 'object', required: ['rows'],
    properties: {
      currency: { type: 'string' },
      rows: {
        type: 'array', items: {
          type: 'object', required: ['date', 'merchant', 'amount', 'direction', 'category'],
          properties: {
            date: { type: 'string', description: 'YYYY-MM-DD' },
            merchant: { type: 'string', description: 'Clean merchant name, Title Case, no card numbers or reference codes' },
            description: { type: 'string' },
            amount: { type: 'number', description: 'Positive number' },
            direction: { type: 'string', enum: ['out', 'in'] },
            category: { type: 'string', enum: CAT_KEYS },
            recurring: { type: 'boolean', description: 'Looks like a subscription or regular bill' },
            transfer: { type: 'boolean', description: 'Transfer between own accounts, card repayment, or cash withdrawal' },
          },
        },
      },
    },
};

const RECEIPT_SCHEMA = {
    type: 'object', required: ['merchant', 'total', 'category'],
    properties: {
      merchant: { type: 'string' }, total: { type: 'number', description: 'Final amount paid including tax and tip' },
      date: { type: 'string', description: 'YYYY-MM-DD if visible' }, category: { type: 'string', enum: CAT_KEYS },
      readable: { type: 'boolean', description: 'False if this is not a receipt or cannot be read' },
    },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const auth = req.headers.get('Authorization') ?? '';
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: 'auth' }, 401);

    const body = await req.json();
    const pro = await isPro(user.id, !!body.demoPro);
    if (body.action === 'usage') return json({ pro, usage: await remaining(user.id, pro) });

    const feature = FEATURE[body.action];
    if (!feature) return json({ error: 'bad_action' }, 400);
    const left = (await remaining(user.id, pro))[feature];
    if (left.left <= 0) return json({ error: 'limit', feature, pro, limit: left.limit, scope: left.scope }, 402);

    const today = String(body.today ?? new Date().toISOString().slice(0, 10));
    const currency = String(body.currency ?? 'USD');
    let result: unknown;

    if (body.action === 'parse') {
      const text = String(body.text ?? '').slice(0, 500);
      const bills = (body.bills ?? []).slice(0, 30).join(', ') || 'none';
      result = await gemini(
        `You turn short budgeting messages into entries for Kwik Budget. Today is ${today}. Currency: ${currency}.
Rules: one entry per purchase. "amount" is what this person paid (their share if they mention one). Use days_ago for "yesterday", weekdays etc.
Income words (got, tips, refund, salary, sold) are income. "X paid" for one of these bills is bill_paid: ${bills}.
If there is no amount or it is not about money, return kind "unknown". Local food, slang and brand names are fine to interpret.
Categories:\n${catList}`,
        [{ text }], ENTRY_SCHEMA, FAST(), 800);
    } else if (body.action === 'statement') {
      const f = body.file ?? {};
      const content: unknown[] = [];
      if (f.mime === 'application/pdf' && f.base64) {
        if (String(f.base64).length > 9_000_000) return json({ error: 'too_large' }, 413);
        content.push({ inlineData: { mimeType: 'application/pdf', data: f.base64 } });
      } else {
        content.push({ text: String(f.text ?? '').slice(0, 120_000) });
      }
      content.push({ text: 'Extract every transaction from this statement.' });
      result = await gemini(
        `You read bank, card and mobile money statements for a budgeting app. Today is ${today}. Expected currency: ${currency}.
Return every transaction. Amounts are positive; use direction "out" for money spent and "in" for money received.
Clean merchant names (no reference numbers). Mark transfers between own accounts, card repayments and cash withdrawals as transfer=true.
Mark likely subscriptions and regular bills as recurring=true.
Categories:\n${catList}`,
        content, STATEMENT_SCHEMA, STRONG(), 16000);
    } else {
      const img = String(body.image ?? '');
      if (!img || img.length > 6_000_000) return json({ error: 'too_large' }, 413);
      result = await gemini(
        `You read shop receipts for a budgeting app. Today is ${today}. Currency: ${currency}. Return the final total paid.
Categories:\n${catList}`,
        [{ inlineData: { mimeType: body.mime ?? 'image/jpeg', data: img } }, { text: 'Read this receipt.' }], RECEIPT_SCHEMA, FAST(), 600);
    }

    await admin.rpc('bump_ai_usage', { p_user: user.id, p_feature: feature });
    return json({ ok: true, pro, result, left: left.left - 1 });
  } catch (e) {
    return json({ error: 'server', message: String((e as Error)?.message ?? e) }, 500);
  }
});
