-- Kwik Budget v1.1: categories, notes, recurring bills, extra income, profile settings, account deletion.
-- Run after 0001_init.sql.

alter table public.profiles
  add column if not exists goals text[] not null default '{}',
  add column if not exists pay_frequency text not null default 'monthly'
    check (pay_frequency in ('weekly','biweekly','monthly','irregular'));

alter table public.transactions
  add column if not exists category text not null default 'other',
  add column if not exists note text;

alter table public.bills
  add column if not exists recurring boolean not null default true;

create table if not exists public.incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  cycle_id uuid not null references public.cycles(id) on delete cascade,
  jar_id uuid not null references public.jars(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  note text,
  occurred_on date not null default current_date,
  created_at timestamptz not null default now()
);
alter table public.incomes enable row level security;
drop policy if exists "own rows" on public.incomes;
create policy "own rows" on public.incomes for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Jar budgets can be edited after setup (Pro), keep them non-negative.
alter table public.jars drop constraint if exists jars_budget_check;
alter table public.jars add constraint jars_budget_check check (budget >= 0);

-- create_cycle now carries the recurring flag on bills.
create or replace function public.create_cycle(p_income numeric, p_payday date, p_bills jsonb, p_jars jsonb)
returns uuid language plpgsql as $$
declare cid uuid;
begin
  update public.cycles set active = false where user_id = auth.uid() and active;
  insert into public.cycles(income, payday) values (p_income, p_payday) returning id into cid;
  insert into public.bills(cycle_id, name, amount, due_date, recurring)
    select cid, b->>'name', (b->>'amount')::numeric, (b->>'due_date')::date, coalesce((b->>'recurring')::boolean, true)
    from jsonb_array_elements(p_bills) b;
  insert into public.jars(cycle_id, key, name, budget, locked)
    select cid, j->>'key', j->>'name', (j->>'budget')::numeric, (j->>'locked')::boolean from jsonb_array_elements(p_jars) j;
  return cid;
end $$;

-- In-app account deletion (required by Apple and Google). Cascades remove every row.
create or replace function public.delete_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
