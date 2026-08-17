-- Peoplearound — 0040 admins have no cap
--
-- The abuse caps (0017) exist to stop a bot with accounts from flooding the
-- place. An admin is the operator; seeding demos, cleaning up, and running
-- the pilot all mean creating things in bursts a neighbor never would.
-- Yesterday the operator's own account tripped the projects cap and was
-- told to "come back tomorrow" by their own product.
--
-- Fixed once, at the choke point: every capped table (projects, offers,
-- communities, conversations, messages, flags, updates) already funnels
-- through assert_rate, so an admin check here covers all of them — and any
-- cap added in future — without touching a single trigger. AI credit
-- (consume_ai_credit) has its own path and gets the same exemption below,
-- because every shape-idea call costs real money and an operator demoing
-- the wizard shouldn't hit "you've reached today's limit" either.
--
-- Also: an admin's actions are no longer *logged*, so a period spent
-- seeding doesn't fill their own history with noise. my_action_count
-- (0038) therefore reports 0 for admins and the wizard's door notice never
-- shows — consistent with the enforcement.
-- Idempotent.

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
  -- Operators are exempt: no count, no log.
  if exists (
    select 1 from public.profiles p
     where p.id = p_user and p.is_admin = true
  ) then
    return;
  end if;

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

-- The 0038 peek must agree with the enforcer, or the wizard door would
-- show a notice the trigger would never enforce.
create or replace function public.my_action_count(
  p_action text,
  p_window interval default interval '24 hours'
) returns integer
language sql
security definer
set search_path = public
stable
as $$
  select case
    when exists (
      select 1 from public.profiles p
       where p.id = auth.uid() and p.is_admin = true
    ) then 0
    else (
      select count(*)::int
        from public.user_action_log l
       where l.user_id = auth.uid()
         and l.action = p_action
         and l.created_at > now() - p_window
    )
  end;
$$;

-- Same exemption for AI shaping — every call costs real money, but the
-- operator demoing the wizard shouldn't hit "today's limit" either.
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
  if exists (
    select 1 from public.profiles p
     where p.id = auth.uid() and p.is_admin = true
  ) then
    return true;
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

-- Clear the operator's own history from yesterday's ten-click burst, so the
-- notice doesn't linger for the rest of the window even though enforcement
-- is already off.
delete from public.user_action_log l
 using public.profiles p
 where p.id = l.user_id and p.is_admin = true;
