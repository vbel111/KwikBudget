-- Kwik Budget v1.2: merchant memory, subscriptions, Kwik AI usage limits. Safe to run more than once.

-- Merchant memory: what each person files a merchant under, learned from their own corrections.
create table if not exists public.merchant_rules (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  merchant_key text not null,
  category text not null,
  jar_key text not null check (jar_key in ('food','transport','fun','buffer')),
  updated_at timestamptz not null default now(),
  primary key (user_id, merchant_key)
);
alter table public.merchant_rules enable row level security;
drop policy if exists "own rows" on public.merchant_rules;
create policy "own rows" on public.merchant_rules for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.merchant_rules to authenticated;

-- Subscriptions are bills with a billing period, an optional free-trial end and price history.
alter table public.bills
  add column if not exists kind text not null default 'bill' check (kind in ('bill','subscription')),
  add column if not exists billing text not null default 'monthly' check (billing in ('weekly','monthly','yearly')),
  add column if not exists trial_ends date,
  add column if not exists prev_amount numeric(12,2);

-- Kwik AI usage, counted per person, per day, per feature. Written only by the server (edge function).
create table if not exists public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default current_date,
  feature text not null check (feature in ('chat','statement','receipt')),
  count int not null default 0,
  primary key (user_id, day, feature)
);
alter table public.ai_usage enable row level security;
drop policy if exists "read own usage" on public.ai_usage;
create policy "read own usage" on public.ai_usage for select to authenticated using (user_id = auth.uid());
grant select on public.ai_usage to authenticated;

-- Atomic usage counter used by the edge function (service role).
create or replace function public.bump_ai_usage(p_user uuid, p_feature text) returns int
language sql security definer set search_path = public as $$
  insert into public.ai_usage(user_id, day, feature, count) values (p_user, current_date, p_feature, 1)
  on conflict (user_id, day, feature) do update set count = public.ai_usage.count + 1
  returning count;
$$;
revoke all on function public.bump_ai_usage(uuid, text) from public, anon, authenticated;

-- create_cycle carries subscription fields across cycles.
create or replace function public.create_cycle(p_income numeric, p_payday date, p_bills jsonb, p_jars jsonb)
returns uuid language plpgsql set search_path = public as $$
declare cid uuid;
begin
  update public.cycles set active = false where user_id = auth.uid() and active;
  insert into public.cycles(income, payday) values (p_income, p_payday) returning id into cid;
  insert into public.bills(cycle_id, name, amount, due_date, recurring, kind, billing, trial_ends)
    select cid, b->>'name', (b->>'amount')::numeric, (b->>'due_date')::date,
           coalesce((b->>'recurring')::boolean, true), coalesce(b->>'kind', 'bill'), coalesce(b->>'billing', 'monthly'),
           nullif(b->>'trial_ends', '')::date
    from jsonb_array_elements(p_bills) b;
  insert into public.jars(cycle_id, key, name, budget, locked)
    select cid, j->>'key', j->>'name', (j->>'budget')::numeric, (j->>'locked')::boolean
    from jsonb_array_elements(p_jars) j;
  return cid;
end $$;
revoke all on function public.create_cycle(numeric, date, jsonb, jsonb) from public, anon;
grant execute on function public.create_cycle(numeric, date, jsonb, jsonb) to authenticated;

notify pgrst, 'reload schema';
