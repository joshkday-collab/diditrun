-- DidItRun week-1 schema.
-- Apply with: supabase db push   or   paste into the SQL editor.
-- Ping routes use the service role. The UUID is the capability token.
-- Dashboard rows are RLS-scoped to auth.uid().

create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'plan_id') then
    create type public.plan_id as enum ('free', 'solo', 'pro');
  end if;
  if not exists (select 1 from pg_type where typname = 'ping_status') then
    create type public.ping_status as enum ('ok', 'fail');
  end if;
  if not exists (select 1 from pg_type where typname = 'alert_type') then
    create type public.alert_type as enum ('overdue', 'zero_count', 'meta');
  end if;
  if not exists (select 1 from pg_type where typname = 'alert_channel') then
    create type public.alert_channel as enum ('email', 'log');
  end if;
end$$;

create table if not exists public.profiles (
  id uuid primary key,
  email text not null unique,
  plan public.plan_id not null default 'free',
  alert_email text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.checks (
  id uuid primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  period_seconds integer not null check (period_seconds >= 5),
  grace_seconds integer not null check (grace_seconds >= 0),
  paused boolean not null default false,
  last_ping_at timestamptz,
  last_ok_ping_at timestamptz,
  last_count integer,
  last_count_provided boolean not null default false,
  last_status public.ping_status,
  assert_zero boolean not null default true,
  is_meta boolean not null default false,
  created_at timestamptz not null default now(),
  constraint checks_id_uuidv4 check (
    id::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  )
);

create table if not exists public.pings (
  id uuid primary key default gen_random_uuid(),
  check_id uuid not null references public.checks (id) on delete cascade,
  received_at timestamptz not null default now(),
  status public.ping_status not null,
  count integer,
  count_provided boolean not null default false,
  ip text,
  user_agent text
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  check_id uuid not null references public.checks (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  type public.alert_type not null,
  sent_at timestamptz not null default now(),
  channel public.alert_channel not null,
  payload jsonb not null default '{}'::jsonb
);

create table if not exists public.ping_rate (
  check_id uuid primary key references public.checks (id) on delete cascade,
  hits bigint[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists public.meta_state (
  id text primary key default 'singleton',
  check_id uuid references public.checks (id),
  last_ping_at timestamptz,
  last_evaluate_at timestamptz,
  period_seconds integer not null default 60,
  grace_seconds integer not null default 30
);

create table if not exists public.billing_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  plan text not null check (plan in ('solo', 'pro')),
  status text not null default 'stub_pending',
  created_at timestamptz not null default now()
);

create index if not exists checks_user_id_idx on public.checks (user_id);
create index if not exists pings_check_received_idx on public.pings (check_id, received_at desc);
create index if not exists alerts_user_sent_idx on public.alerts (user_id, sent_at desc);
create index if not exists alerts_check_sent_idx on public.alerts (check_id, sent_at desc);

alter table public.profiles enable row level security;
alter table public.checks enable row level security;
alter table public.pings enable row level security;
alter table public.alerts enable row level security;
alter table public.ping_rate enable row level security;
alter table public.meta_state enable row level security;
alter table public.billing_intents enable row level security;

drop policy if exists "own profile select" on public.profiles;
create policy "own profile select" on public.profiles
  for select to authenticated using (auth.uid() = id);

drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own checks all" on public.checks;
create policy "own checks all" on public.checks
  for all to authenticated
  using (auth.uid() = user_id and is_meta = false)
  with check (auth.uid() = user_id and is_meta = false);

drop policy if exists "own pings select" on public.pings;
create policy "own pings select" on public.pings
  for select to authenticated
  using (
    exists (
      select 1 from public.checks c
      where c.id = pings.check_id and c.user_id = auth.uid()
    )
  );

drop policy if exists "own alerts select" on public.alerts;
create policy "own alerts select" on public.alerts
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "own billing select" on public.billing_intents;
create policy "own billing select" on public.billing_intents
  for select to authenticated
  using (user_id = auth.uid());

-- ping_rate and meta_state: service role only (no policies for authenticated).

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, alert_email, plan)
  values (new.id, new.email, new.email, 'free')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Service role (and postgres) bypass RLS. Authenticated users never insert pings.