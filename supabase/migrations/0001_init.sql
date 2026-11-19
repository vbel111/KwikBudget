-- Kwik Budget schema. Run in Supabase SQL editor or `supabase db push`.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  currency text not null default 'USD',
  created_at timestamptz not null default now()
);

create table public.cycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  start_date date not null default current_date,
  payday date not null,
  income numeric(12,2) not null check (income > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index one_active_cycle on public.cycles(user_id) where active;

create table public.bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  cycle_id uuid not null references public.cycles(id) on delete cascade,
  name text not null,
  amount numeric(12,2) not null check (amount >= 0),
  due_date date not null,
  paid boolean not null default false
);

create table public.jars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  cycle_id uuid not null references public.cycles(id) on delete cascade,
  key text not null check (key in ('bills','savings','food','transport','fun','buffer')),
  name text not null,
  budget numeric(12,2) not null check (budget >= 0),
  locked boolean not null default false
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  cycle_id uuid not null references public.cycles(id) on delete cascade,
  jar_id uuid not null references public.jars(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  merchant text,
  occurred_on date not null default current_date,
  created_at timestamptz not null default now()
);
create index tx_cycle_day on public.transactions(cycle_id, occurred_on);

create table public.jar_moves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  cycle_id uuid not null references public.cycles(id) on delete cascade,
  from_jar uuid not null references public.jars(id) on delete cascade,
  to_jar uuid not null references public.jars(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  created_at timestamptz not null default now()
);

-- Row level security: every row belongs to exactly one user.
do $$ declare t text; begin
  foreach t in array array['cycles','bills','jars','transactions','jar_moves'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "own rows" on public.%I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;
alter table public.profiles enable row level security;
create policy "own profile" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());

-- Create a profile on sign up.
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into public.profiles(id, name) values (new.id, split_part(new.email,'@',1)) on conflict do nothing; return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Atomic payday setup: closes the old cycle, then creates cycle + bills + jars in one call.
create function public.create_cycle(p_income numeric, p_payday date, p_bills jsonb, p_jars jsonb)
returns uuid language plpgsql as $$
declare cid uuid;
begin
  update public.cycles set active = false where user_id = auth.uid() and active;
  insert into public.cycles(income, payday) values (p_income, p_payday) returning id into cid;
  insert into public.bills(cycle_id, name, amount, due_date)
    select cid, b->>'name', (b->>'amount')::numeric, (b->>'due_date')::date from jsonb_array_elements(p_bills) b;
  insert into public.jars(cycle_id, key, name, budget, locked)
    select cid, j->>'key', j->>'name', (j->>'budget')::numeric, (j->>'locked')::boolean from jsonb_array_elements(p_jars) j;
  return cid;
end $$;
