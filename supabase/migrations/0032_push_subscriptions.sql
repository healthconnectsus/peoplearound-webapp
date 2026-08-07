-- Peoplearound — 0032 web push subscriptions
--
-- Push is a *delivery channel* for the notifications table (0025), not a
-- second source of truth. Triggers already write every notification; a cron
-- job then pushes the ones that haven't been delivered yet. That means:
--   • no HTTP calls from inside Postgres triggers
--   • a failed push never loses the in-app notification
--   • turning push off changes nothing about what the bell shows
--
-- Subscriptions are strictly own-row: a user can see and delete only their
-- own endpoints, and nobody (not even another authenticated user) can read
-- someone else's push endpoint — an endpoint URL is a capability that can
-- send a device a notification, so it is treated like a credential.
-- Idempotent.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  -- set when a push to this endpoint fails permanently (404/410); the cron
  -- prunes them rather than retrying a dead device forever.
  failed_at timestamptz
);
alter table public.push_subscriptions enable row level security;

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

drop policy if exists "read own push subs" on public.push_subscriptions;
create policy "read own push subs"
  on public.push_subscriptions for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "insert own push subs" on public.push_subscriptions;
create policy "insert own push subs"
  on public.push_subscriptions for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "delete own push subs" on public.push_subscriptions;
create policy "delete own push subs"
  on public.push_subscriptions for delete to authenticated
  using (user_id = auth.uid());

-- Delivery marker. Null = never attempted.
alter table public.notifications
  add column if not exists pushed_at timestamptz;

create index if not exists notifications_pending_push_idx
  on public.notifications (created_at)
  where pushed_at is null;

-- Opt-out lives beside the existing digest opt-out so "how do I stop being
-- emailed/pinged" is one place in settings.
alter table public.profiles
  add column if not exists push_opt_out boolean not null default false;

-- ============================================================
-- pending_pushes() — service-role only.
-- Returns undelivered notifications joined to live subscriptions, skipping
-- opted-out users, notifications the user already read (they've seen it),
-- and anything older than 24h (a stale ping is worse than none).
-- ============================================================
create or replace function public.pending_pushes(p_limit int default 200)
returns table (
  notification_id uuid,
  body text,
  href text,
  endpoint text,
  p256dh text,
  auth text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'service role only';
  end if;

  return query
  select n.id, n.body, n.href, s.endpoint, s.p256dh, s.auth
  from public.notifications n
  join public.push_subscriptions s on s.user_id = n.user_id
  join public.profiles p on p.id = n.user_id
  where n.pushed_at is null
    and n.read_at is null
    and n.created_at > now() - interval '24 hours'
    and s.failed_at is null
    and p.push_opt_out = false
  order by n.created_at
  limit greatest(1, least(p_limit, 500));
end;
$$;

revoke all on function public.pending_pushes(int) from public, anon, authenticated;
