export type JarKey = 'bills' | 'savings' | 'food' | 'transport' | 'fun' | 'buffer';
export type PayFrequency = 'weekly' | 'biweekly' | 'monthly' | 'irregular';
export type Cycle = { id: string; start_date: string; payday: string; income: number };
export type BillKind = 'bill' | 'subscription';
export type Billing = 'weekly' | 'monthly' | 'yearly';
export type Bill = {
  id: string; name: string; amount: number; due_date: string; paid: boolean; recurring: boolean;
  kind: BillKind; billing: Billing; trial_ends: string | null; prev_amount: number | null;
};
/** Learned from the person's own corrections: "kofi's" → Eating out, Food jar. */
export type MerchantRule = { merchant_key: string; category: string; jar_key: JarKey };
export type Jar = { id: string; key: JarKey; name: string; budget: number; locked: boolean };
export type Tx = {
  id: string; jar_id: string; amount: number; merchant: string | null; category: string;
  note: string | null; occurred_on: string; created_at: string;
};
export type Move = { id: string; from_jar: string; to_jar: string; amount: number };
export type Income = { id: string; jar_id: string; amount: number; note: string | null; occurred_on: string };
export type Profile = { name: string; currency: string; goals: string[]; pay_frequency: PayFrequency };
