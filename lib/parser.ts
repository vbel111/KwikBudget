import type { Bill, JarKey, MerchantRule } from './types';
import { CATEGORIES, CategoryKey, catByKey } from './categories';

/*
 * Kwik Budget's on-device parser. Pure logic: instant, free, offline.
 * Order of trust: the person's own merchant memory → keyword rules → (if still unsure) Kwik AI.
 *
 * Understands, for example:
 *   "lunch 8.50 mamas"                 one spend
 *   "coffee 4, bus 2.50 and snacks 3"  several spends at once
 *   "uber 14 yesterday" / "on monday"  past days
 *   "2 coffees 4 each" / "coffee 4 x2" quantities
 *   "dinner 60 my share 20"            your share only
 *   "dinner 60 split 3 ways"           even split
 *   "rent paid"                        marks a bill paid
 *   "got 50 tips"                      extra income
 */

export type Memory = Record<string, MerchantRule>;
export type Spend = {
  kind: 'spend'; amount: number; merchant: string; category: CategoryKey; jarKey: JarKey | null;
  daysAgo: number; note: string | null; confident: boolean; source: 'memory' | 'rules' | 'ai';
};
export type Parsed =
  | Spend
  | { kind: 'income'; amount: number; note: string; daysAgo: number }
  | { kind: 'billPaid'; bill: Bill }
  | { kind: 'unknown'; text: string };

const STOP = new Set(['at', 'on', 'for', 'the', 'a', 'an', 'spent', 'paid', 'bought', 'got', 'some', 'my', 'to', 'in', 'with', 'of', 'from', 'each', 'and', 'i', 'today']);
const INCOME = /^(got|received|earned|income|bonus|refund|salary|side|tip|tips|sold|cashback)\b|\b(refund|bonus|tips?|cashback|side hustle|gig money)\b/;
const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const SHORT_DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const NUM = String.raw`(?:[$€£₦₵]|gh₵|ksh)?\s*(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(k)?`;

export const merchantKey = (s: string) => s.toLowerCase().replace(/'s\b/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const cap = (s: string) => s.split(' ').map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(' ');
const toNum = (raw: string, k?: string) => {
  let n = Number(raw.includes('.') || /,\d{3}/.test(raw) ? raw.replace(/,/g, '') : raw.replace(',', '.'));
  if (k) n *= 1000;
  return Math.round(n * 100) / 100;
};

/** Pulls a date phrase out of the text and returns how many days ago it was. */
function extractDate(t: string, today = new Date()): { text: string; daysAgo: number } {
  let daysAgo = 0; let text = t;
  const rx: [RegExp, (m: RegExpMatchArray) => number][] = [
    [/\bday before yesterday\b/, () => 2],
    [/\byesterday\b|\blast night\b|\bystd\b/, () => 1],
    [/\b(\d{1,2}) days? ago\b/, (m) => Number(m[1])],
    [/\b(?:on |last )?(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|wed|thu|fri|sat)\b/, (m) => {
      const w = m[1]; const idx = DAYS.indexOf(w) >= 0 ? DAYS.indexOf(w) : SHORT_DAYS.indexOf(w);
      return (today.getDay() - idx + 7) % 7;
    }],
  ];
  for (const [r, f] of rx) { const m = text.match(r); if (m) { daysAgo = f(m); text = text.replace(m[0], ' '); break; } }
  return { text, daysAgo: Math.min(daysAgo, 60) };
}

function lookupMemory(words: string[], memory: Memory): MerchantRule | null {
  const phrase = words.join(' ');
  if (memory[phrase]) return memory[phrase];
  for (let n = Math.min(3, words.length); n >= 1; n--) {
    for (let i = 0; i + n <= words.length; i++) {
      const k = words.slice(i, i + n).join(' ');
      if (memory[k]) return memory[k];
    }
  }
  return null;
}

function parseItem(raw: string, daysAgo: number, memory: Memory): Parsed {
  let t = ` ${raw} `; let qty = 1; let note: string | null = null;

  // "2 coffees 4 each"
  const each = t.match(new RegExp(String.raw`\b(\d{1,2})\s+([a-z' ]+?)\s+${NUM}\s*each\b`));
  if (each) { qty = Number(each[1]); t = t.replace(each[0], ` ${each[2]} ${each[3]}${each[4] ?? ''} `); }
  // "coffee 4 x2", "2x coffee 4"
  const x = t.match(/\bx\s?(\d{1,2})\b|\b(\d{1,2})\s?x\b/);
  if (!each && x) { qty = Number(x[1] ?? x[2]); t = t.replace(x[0], ' '); }

  // "my share 20" or "split 3 ways"
  let share: number | null = null; let splitWays = 1;
  const sh = t.match(new RegExp(String.raw`\b(?:my share|my part|i paid|mine)\s*(?:was|is|of)?\s*${NUM}`));
  if (sh) { share = toNum(sh[1], sh[2]); t = t.replace(sh[0], ' '); }
  const sp = t.match(/\bsplit\s+(?:it\s+)?(?:(\d{1,2})|two|three|four)\s*(?:ways|people)?\b/);
  if (!sh && sp) { splitWays = sp[1] ? Number(sp[1]) : ({ two: 2, three: 3, four: 4 } as any)[sp[0].split(/\s+/).pop()!] ?? 2; t = t.replace(sp[0], ' '); }

  const m = t.match(new RegExp(NUM));
  if (!m && share == null) return { kind: 'unknown', text: raw.trim() };
  const total = m ? toNum(m[1], m[2]) : share!;
  if (m) t = t.replace(m[0], ' ');
  let amount = share ?? total * qty;
  if (share != null && m) note = `Your share of ${total}`;
  if (splitWays > 1) { amount = Math.round((total * qty / splitWays) * 100) / 100; note = `Split ${splitWays} ways (total ${total * qty})`; }
  if (qty > 1 && !note) note = `${qty} × ${total}`;
  if (!isFinite(amount) || amount <= 0) return { kind: 'unknown', text: raw.trim() };

  const words = merchantKey(t).split(' ').filter(Boolean);
  if (INCOME.test(raw)) return { kind: 'income', amount, note: cap(words.filter((w) => !STOP.has(w)).join(' ')) || 'Extra income', daysAgo };
  const label = words.filter((w) => !STOP.has(w));

  // 1) the person's own memory
  const mem = lookupMemory(label, memory);
  if (mem) {
    const c = catByKey(mem.category);
    return { kind: 'spend', amount, merchant: prettyMerchant(mem.merchant_key), category: c.key, jarKey: mem.jar_key, daysAgo, note, confident: true, source: 'memory' };
  }
  // 2) keyword rules
  let category: CategoryKey = 'other'; let keyword = '';
  const hit = findKeyword(label);
  if (hit) { category = hit.category; keyword = hit.word; }
  const cat = catByKey(category);
  const named = label.filter((w) => !keyword.split(' ').includes(w) && singular(w) !== keyword);
  const merchant = prettyMerchant(named.length ? named.join(' ') : keyword || cat.label);
  return { kind: 'spend', amount, merchant, category, jarKey: category === 'other' ? null : cat.jar, daysAgo, note, confident: category !== 'other', source: 'rules' };
}

const singular = (w: string) => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w);

/** Two-word phrases first ("chop bar"), then single words, then their singular form ("coffees" → "coffee"). */
function findKeyword(words: string[]): { category: CategoryKey; word: string } | null {
  for (let i = 0; i + 1 < words.length; i++) {
    const ph = `${words[i]} ${words[i + 1]}`;
    for (const c of CATEGORIES) if (c.words.includes(ph)) return { category: c.key, word: ph };
  }
  for (const w of words) for (const c of CATEGORIES) if (c.words.includes(w) || c.words.includes(singular(w))) return { category: c.key, word: singular(w) };
  return null;
}

export function prettyMerchant(key: string) {
  const k = key.trim();
  if (/^mamas?$/.test(k)) return "Mama's";
  return cap(k);
}

/** Splits a message into separate entries only when every part has its own amount. */
function splitItems(t: string): string[] {
  t = t.replace(/(\d),(\d{3})\b/g, '$1$2'); // 1,200 is one number, not two items
  const parts = t.split(/\s*(?:,|;|\n|\+|&|\band\b|\bplus\b)\s*/).map((p) => p.trim()).filter(Boolean);
  if (parts.length > 1 && parts.every((p) => new RegExp(NUM).test(p))) return parts;
  return [t];
}

export function parseEntries(text: string, bills: Bill[], memory: Memory = {}, today = new Date()): Parsed[] {
  const lower = text.trim().toLowerCase();
  if (!lower) return [];
  const paid = lower.match(/^(.*?)\s*(paid|done)$/);
  if (paid && !/\d/.test(paid[1])) {
    const name = paid[1].trim();
    const bill = bills.find((b) => !b.paid && name && (b.name.toLowerCase().includes(name) || name.includes(b.name.toLowerCase())));
    if (bill) return [{ kind: 'billPaid', bill }];
  }
  const { text: rest, daysAgo } = extractDate(lower, today);
  return splitItems(rest).map((p) => parseItem(p, daysAgo, memory));
}

/** Backwards-compatible single-entry helper. */
export function parseEntry(text: string, bills: Bill[], memory: Memory = {}): Parsed {
  return parseEntries(text, bills, memory)[0] ?? { kind: 'unknown', text };
}
