import type { IconName } from '@/components/Icon';

/*
 * Single source of truth for Free vs Pro. The paywall, Settings and every gate read from here,
 * and the server (supabase/functions/ai) enforces the same AI limits.
 *
 * Principle: the daily habit is free forever (daily number, jars, chat logging, bills, subscriptions).
 * Pro is automation and foresight: Kwik AI, statement import, receipt scan, reminders, insights.
 */

export const AI_LIMITS = {
  free: { chat: '3 a day', statement: '1 free try', receipt: '2 free tries' },
  pro: { chat: 'Unlimited*', statement: 'Unlimited*', receipt: 'Unlimited*' },
};

export type ProFeature = { key: string; icon: IconName; title: string; sub: string };

/** Shown on the paywall, in order of value. */
export const PRO_FEATURES: ProFeature[] = [
  { key: 'ai', icon: 'sparkles', title: 'Kwik AI understands anything', sub: 'Slang, local food, splits, several items at once' },
  { key: 'statement', icon: 'doc', title: 'Import bank & mobile money statements', sub: 'PDF or CSV, catches everything you forgot to log' },
  { key: 'receipt', icon: 'receipt', title: 'Scan receipts', sub: 'Point your camera, the entry fills itself' },
  { key: 'subs', icon: 'repeat', title: 'Subscription alerts', sub: 'Renewals, free trials ending, price rises' },
  { key: 'bills', icon: 'bell', title: 'Bill reminders', sub: 'A heads-up the day before every bill leaves' },
  { key: 'insights', icon: 'insights', title: 'Insights and payday forecast', sub: 'Where it goes and where you will land' },
  { key: 'tools', icon: 'search', title: 'Search, export and edit jars', sub: 'Full control of your history and plan' },
];

export type CompareRow = { label: string; free: string | boolean; pro: string | boolean };
export const COMPARE: CompareRow[] = [
  { label: 'Daily safe-to-spend number', free: true, pro: true },
  { label: 'Money jars and payday plan', free: true, pro: true },
  { label: 'Chat logging that learns you', free: true, pro: true },
  { label: 'Bills and subscriptions list', free: true, pro: true },
  { label: 'Weekly review and streaks', free: true, pro: true },
  { label: 'Kwik AI in chat', free: AI_LIMITS.free.chat, pro: AI_LIMITS.pro.chat },
  { label: 'Statement import', free: AI_LIMITS.free.statement, pro: AI_LIMITS.pro.statement },
  { label: 'Receipt scan', free: AI_LIMITS.free.receipt, pro: AI_LIMITS.pro.receipt },
  { label: 'Bill and subscription reminders', free: false, pro: true },
  { label: 'Price rise and trial alerts', free: false, pro: true },
  { label: 'Category insights and forecast', free: false, pro: true },
  { label: 'Search and CSV export', free: false, pro: true },
  { label: 'Edit jar budgets mid-cycle', free: false, pro: true },
];
export const FAIR_USE = '*Fair use: 200 AI messages, 10 statements and 40 receipts a day.';
