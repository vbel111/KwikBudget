-- Kwik Budget: full database setup.
-- Supabase > SQL Editor > New query > paste everything > Run. Safe to run more than once.

-- ============ Tables ============
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  currency text not null default 'USD',
  goals text[] not null default '{}',
  pay_frequency text not null default 'monthly' check (pay_frequency in ('weekly','biweekly','monthly','irregular')),
  created_at timestamptz not null default now()
);

create table if not exists public.cycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  start_date date not null default current_date,
  payday date not null,
  income numeric(12,2) not null check (income > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists one_active_cycle on public.cycles(user_id) where active;

create table if not exists public.bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cycle_id uuid not null references public.cycles(id) on delete cascade,
  name text not null,
  amount numeric(12,2) not null check (amount >= 0),
  due_date date not null,
  paid boolean not null default false,
  recurring boolean not null default true
);

create table if not exists public.jars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cycle_id uuid not null references public.cycles(id) on delete cascade,
  key text not null check (key in ('bills','savings','food','transport','fun','buffer')),
  name text not null,
  budget numeric(12,2) not null check (budget >= 0),
  locked boolean not null default false
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cycle_id uuid not null references public.cycles(id) on delete cascade,
  jar_id uuid not null references public.jars(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  merchant text,
  category text not null default 'other',
  note text,
  occurred_on date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists tx_cycle_day on public.transactions(cycle_id, occurred_on);

create table if not exists public.jar_moves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cycle_id uuid not null references public.cycles(id) on delete cascade,
  from_jar uuid not null references public.jars(id) on delete cascade,
  to_jar uuid not null references public.jars(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cycle_id uuid not null references public.cycles(id) on delete cascade,
  jar_id uuid not null references public.jars(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  note text,
  occurred_on date not null default current_date,
  created_at timestamptz not null default now()
);

-- ============ Security: every row belongs to exactly one user ============
do $$ declare t text; begin
  foreach t in array array['cycles','bills','jars','transactions','jar_moves','incomes'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format('create policy "own rows" on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;
alter table public.profiles enable row level security;
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for all to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Signed-in users (including silent/anonymous accounts) can reach the tables; RLS above limits them to their own rows.
grant select, insert, update, delete on public.profiles, public.cycles, public.bills, public.jars,
  public.transactions, public.jar_moves, public.incomes to authenticated;

-- ============ Profile row for every new account ============
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, name) values (new.id, nullif(split_part(coalesce(new.email, ''), '@', 1), ''))
  on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ============ Payday setup in one call ============
-- Closes the previous cycle, then creates the cycle, its bills and its jars atomically.
create or replace function public.create_cycle(p_income numeric, p_payday date, p_bills jsonb, p_jars jsonb)
returns uuid language plpgsql set search_path = public as $$
declare cid uuid;
begin
  update public.cycles set active = false where user_id = auth.uid() and active;
  insert into public.cycles(income, payday) values (p_income, p_payday) returning id into cid;
  insert into public.bills(cycle_id, name, amount, due_date, recurring)
    select cid, b->>'name', (b->>'amount')::numeric, (b->>'due_date')::date, coalesce((b->>'recurring')::boolean, true)
    from jsonb_array_elements(p_bills) b;
  insert into public.jars(cycle_id, key, name, budget, locked)
    select cid, j->>'key', j->>'name', (j->>'budget')::numeric, (j->>'locked')::boolean
    from jsonb_array_elements(p_jars) j;
  return cid;
end $$;
revoke all on function public.create_cycle(numeric, date, jsonb, jsonb) from public, anon;
grant execute on function public.create_cycle(numeric, date, jsonb, jsonb) to authenticated;

-- ============ In-app account deletion (required by Apple and Google) ============
create or replace function public.delete_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;

-- Make the API see the new tables and functions straight away.

-- ================= v1.2: merchant memory, subscriptions, Kwik AI =================
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
