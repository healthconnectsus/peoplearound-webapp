-- Peoplearound — 0017 per-user abuse caps
-- Rate limits for authenticated abuse, enforced in the database (the layer
-- a bot with accounts cannot route around):
--   • projects:       10 per user per 24 h
--   • communities:     3 per user per 24 h (+ created_by for attribution)
--   • conversations:  20 per user per 24 h
--   • messages:      200 per user per hour
--   • AI idea shaping (consume_ai_credit): 20 per user per 24 h
-- Caps apply only to authenticated client writes (auth.uid() present);
-- operator SQL and service-role paths (seeds, frontier registration, which
-- has its own caps) are unaffected. Legit users won't feel these numbers.
-- Idempotent.

create table if not exists public.user_action_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  action text not null,
  created_at timestamptz not null default now()
);

alter table public.user_action_log enable row level security;
-- No policies at all: only the security-definer function below touches it.

create index if not exists user_action_log_idx
  on public.user_action_log (user_id, action, created_at desc);

-- Count-and-log gate. Raises on breach — the failed insert surfaces as a
-- database error to the client, which is exactly what abuse deserves.
create or replace function public.assert_rate(
  p_user uuid,
  p_action text,
  p_max int,
  p_window interval
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    select count(*) from public.user_action_log l
     where l.user_id = p_user
       and l.action = p_action
       and l.created_at > now() - p_window
  ) >= p_max then
    raise exception 'rate_limited: too many % actions', p_action
      using errcode = 'P0001';
  end if;
  insert into public.user_action_log (user_id, action) values (p_user, p_action);
end;
$$;

revoke all on function public.assert_rate(uuid, text, int, interval) from public;
revoke all on function public.assert_rate(uuid, text, int, interval) from anon;
revoke all on function public.assert_rate(uuid, text, int, interval) from authenticated;

-- ------------------------------------------------------------------
-- Attribution for communities: who created it (null = operator/system).
-- ------------------------------------------------------------------
alter table public.neighborhoods
  add column if not exists created_by uuid references public.profiles (id) on delete set null;

-- ------------------------------------------------------------------
-- Triggers — apply caps only to authenticated client inserts.
-- ------------------------------------------------------------------
create or replace function public.cap_project_creation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    perform public.assert_rate(auth.uid(), 'project', 10, interval '24 hours');
  end if;
  return new;
end;
$$;
drop trigger if exists projects_rate_cap on public.projects;
create trigger projects_rate_cap
  before insert on public.projects
  for each row execute function public.cap_project_creation();

create or replace function public.cap_community_creation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    perform public.assert_rate(auth.uid(), 'community', 3, interval '24 hours');
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;
drop trigger if exists neighborhoods_rate_cap on public.neighborhoods;
create trigger neighborhoods_rate_cap
  before insert on public.neighborhoods
  for each row execute function public.cap_community_creation();

create or replace function public.cap_conversation_creation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    perform public.assert_rate(auth.uid(), 'conversation', 20, interval '24 hours');
  end if;
  return new;
end;
$$;
drop trigger if exists conversations_rate_cap on public.conversations;
create trigger conversations_rate_cap
  before insert on public.conversations
  for each row execute function public.cap_conversation_creation();

create or replace function public.cap_message_sending()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    perform public.assert_rate(auth.uid(), 'message', 200, interval '1 hour');
  end if;
  return new;
end;
$$;
drop trigger if exists messages_rate_cap on public.messages;
create trigger messages_rate_cap
  before insert on public.messages
  for each row execute function public.cap_message_sending();

-- ------------------------------------------------------------------
-- AI credit gate for /api/shape-idea — every call costs real money.
-- Returns false (rather than raising) so the route can send a clean 429.
-- ------------------------------------------------------------------
create or replace function public.consume_ai_credit()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return false;
  end if;
  if (
    select count(*) from public.user_action_log l
     where l.user_id = auth.uid()
       and l.action = 'shape_idea'
       and l.created_at > now() - interval '24 hours'
  ) >= 20 then
    return false;
  end if;
  insert into public.user_action_log (user_id, action)
  values (auth.uid(), 'shape_idea');
  return true;
end;
$$;

revoke all on function public.consume_ai_credit() from public;
revoke all on function public.consume_ai_credit() from anon;
grant execute on function public.consume_ai_credit() to authenticated;
