-- Peoplearound — 0001 profiles and goals
-- Foundation for the Goals feature. Idempotent so it is safe to re-run.

-- ============================================================
-- profiles: one row per auth user, holds a public display name
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles readable by authenticated" on public.profiles;
create policy "profiles readable by authenticated"
  on public.profiles for select to authenticated using (true);

drop policy if exists "users insert own profile" on public.profiles;
create policy "users insert own profile"
  on public.profiles for insert to authenticated with check (auth.uid() = id);

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- Auto-create a profile whenever a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for any users that already exist.
insert into public.profiles (id, display_name)
select id, coalesce(raw_user_meta_data ->> 'display_name', split_part(email, '@', 1))
from auth.users
on conflict (id) do nothing;

-- ============================================================
-- goals: the central living object
-- ============================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'goal_state') then
    -- NOTE: deliberately no 'failed' state (product guardrail).
    create type public.goal_state as enum ('idea', 'active', 'completed', 'archived');
  end if;
end
$$;

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 140),
  description text not null default '' check (char_length(description) <= 4000),
  category text not null default 'community',
  state public.goal_state not null default 'idea',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.goals enable row level security;

create index if not exists goals_owner_id_idx on public.goals (owner_id);
create index if not exists goals_state_idx on public.goals (state);
create index if not exists goals_created_at_idx on public.goals (created_at desc);

-- Read: any signed-in user can see goals (neighborhood scoping comes later).
drop policy if exists "goals readable by authenticated" on public.goals;
create policy "goals readable by authenticated"
  on public.goals for select to authenticated using (true);

drop policy if exists "users create own goals" on public.goals;
create policy "users create own goals"
  on public.goals for insert to authenticated with check (auth.uid() = owner_id);

drop policy if exists "owners update own goals" on public.goals;
create policy "owners update own goals"
  on public.goals for update to authenticated
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "owners delete own goals" on public.goals;
create policy "owners delete own goals"
  on public.goals for delete to authenticated using (auth.uid() = owner_id);

-- Keep updated_at fresh on every update.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists goals_touch_updated_at on public.goals;
create trigger goals_touch_updated_at
  before update on public.goals
  for each row execute function public.touch_updated_at();
