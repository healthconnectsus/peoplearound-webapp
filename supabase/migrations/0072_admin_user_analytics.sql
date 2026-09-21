-- Peoplearound — 0072 who is real: user counts for the people running the place
--
-- Every raw number the site could show about its users mixes four very
-- different kinds of account. Measured on 2026-09-21, of 222 accounts:
--
--   100  demo fixtures — seeded, @example.com, living in the demo
--        neighborhoods so a first visitor sees a place with people in it;
--   100  sign-ups that never confirmed an email, all created between
--        Aug 15 and Sep 2 (78 of them in one week), none of which ever signed
--        in, joined anything or created anything — the shape of an automated
--        wave against the sign-up form;
--    17  that confirmed an email but never signed in, mostly from that same
--        week (a mail server's link scanner can confirm an address with no
--        person behind it);
--     5  people who have actually signed in.
--
-- So a real user, everywhere below, is an account that is neither a demo
-- fixture nor one of our own test accounts, and has signed in at least once.
-- The rule lives in one function, account_kind(), so the directory's
-- per-community counts and the analytics page can never disagree about it.
--
-- Both readers are for admins only, and enforce it here rather than trusting
-- the page: they are SECURITY DEFINER because they read auth.users — email
-- confirmation and sign-in times, which no signed-in role can see — and each
-- refuses any caller whose own profile is not is_admin. They return counts
-- and community names only: no emails, no names of people.
--
-- Weeks start on Monday and all periods are in UTC.
--
-- Idempotent.

-- The one rule. Pure: it classifies what it is given and reads nothing.
create or replace function public.account_kind(
  p_email text,
  p_confirmed_at timestamptz,
  p_last_sign_in_at timestamptz
)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when p_email like '%@example.com' then 'demo'          -- seeded fixtures
    when p_email like '%@peoplearound.test' then 'test'    -- smoke / budget / QA
    when p_last_sign_in_at is not null then 'real'
    when p_confirmed_at is not null then 'dormant'         -- confirmed, never signed in
    else 'unverified'                                      -- never confirmed
  end;
$$;

-- Only the two functions below need it; they run as its owner.
revoke all on function public.account_kind(text, timestamptz, timestamptz) from public, anon, authenticated;


-- Per community: how many of its members are real, for the Explore directory.
create or replace function public.admin_community_people()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.is_admin
  ) then
    raise exception 'admin only' using errcode = '42501';
  end if;

  return coalesce((
    select jsonb_object_agg(
             x.community_id,
             jsonb_build_object(
               'real_count', x.real_count,
               'real_30d', x.real_30d,
               'demo', x.demo,
               'never_signed_in', x.never_signed_in))
      from (
        select m.community_id,
               count(*) filter (where a.kind = 'real') as real_count,
               count(*) filter (where a.kind = 'real'
                                  and m.created_at > now() - interval '30 days') as real_30d,
               count(*) filter (where a.kind = 'demo') as demo,
               count(*) filter (where a.kind in ('dormant', 'unverified')) as never_signed_in
          from public.community_members m
          join lateral (
            select public.account_kind(u.email, u.email_confirmed_at, u.last_sign_in_at) as kind
              from auth.users u
             where u.id = m.user_id
          ) a on true
         group by m.community_id
      ) x
  ), '{}'::jsonb);
end;
$$;

revoke all on function public.admin_community_people() from public, anon;
grant execute on function public.admin_community_people() to authenticated;


-- Growth of real users, for the analytics page.
create or replace function public.admin_user_growth()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_week  timestamptz := date_trunc('week', now());
  v_month timestamptz := date_trunc('month', now());
  v_year  timestamptz := date_trunc('year', now());
begin
  if not exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.is_admin
  ) then
    raise exception 'admin only' using errcode = '42501';
  end if;

  return (
    with accounts as (
      select u.id, u.created_at, u.invited_at,
             public.account_kind(u.email, u.email_confirmed_at, u.last_sign_in_at) as kind,
             coalesce(p.is_admin, false) as is_admin,
             p.invited_by
        from auth.users u
        left join public.profiles p on p.id = u.id
    ),
    real_users as (
      select a.*,
             exists (select 1 from public.community_members m where m.user_id = a.id)
               as in_community,
             -- Anything beyond signing up.
             (   exists (select 1 from public.projects x where x.owner_id = a.id)
              or exists (select 1 from public.stars x where x.user_id = a.id)
              or exists (select 1 from public.rsvps x where x.user_id = a.id)
              or exists (select 1 from public.memberships x where x.user_id = a.id)
              or exists (select 1 from public.offers x where x.user_id = a.id)
              or exists (select 1 from public.messages x where x.sender_id = a.id)
              or exists (select 1 from public.contributions x where x.contributor_id = a.id))
               as did_something,
             -- A session is refreshed while someone uses the site, so this is
             -- the last time they were here, not just the last sign-in.
             (select max(coalesce(s.refreshed_at, s.updated_at, s.created_at))
                from auth.sessions s where s.user_id = a.id) as last_seen
        from accounts a
       where a.kind = 'real'
    )
    select jsonb_build_object(
      'generated_at', now(),

      'accounts', (
        select jsonb_build_object(
          'real', count(*) filter (where kind = 'real'),
          'real_admins', count(*) filter (where kind = 'real' and is_admin),
          'dormant', count(*) filter (where kind = 'dormant'),
          'unverified', count(*) filter (where kind = 'unverified'),
          'demo', count(*) filter (where kind = 'demo'),
          'test', count(*) filter (where kind = 'test'),
          'never_signed_in_first', min(created_at) filter (where kind in ('dormant', 'unverified')),
          'never_signed_in_last', max(created_at) filter (where kind in ('dormant', 'unverified')),
          'never_signed_in_30d', count(*) filter (where kind in ('dormant', 'unverified')
                                                   and created_at > now() - interval '30 days'))
          from accounts),

      'real', (
        select jsonb_build_object(
          'total', count(*),
          'first_at', min(created_at),
          'year', count(*) filter (where created_at >= v_year),
          'month', count(*) filter (where created_at >= v_month),
          'prev_month', count(*) filter (where created_at >= v_month - interval '1 month'
                                           and created_at < v_month),
          'week', count(*) filter (where created_at >= v_week),
          'prev_week', count(*) filter (where created_at >= v_week - interval '1 week'
                                          and created_at < v_week),
          'last_30d', count(*) filter (where created_at > now() - interval '30 days'),
          'prev_30d', count(*) filter (where created_at > now() - interval '60 days'
                                         and created_at <= now() - interval '30 days'),
          'active_7d', count(*) filter (where last_seen > now() - interval '7 days'),
          'active_30d', count(*) filter (where last_seen > now() - interval '30 days'),
          'in_community', count(*) filter (where in_community),
          'did_something', count(*) filter (where did_something),
          'invited_by_neighbor', count(*) filter (where invited_by is not null),
          'invited_by_admin', count(*) filter (where invited_by is null and invited_at is not null))
          from real_users),

      -- Sign-ups per week for the last twelve weeks, oldest first, with the
      -- ones that never signed in beside them for context.
      'weeks', (
        select jsonb_agg(
                 jsonb_build_object(
                   'week', w.week,
                   'real', (select count(*) from accounts a
                             where a.kind = 'real'
                               and a.created_at >= w.week
                               and a.created_at < w.week + interval '1 week'),
                   'never_signed_in', (select count(*) from accounts a
                                        where a.kind in ('dormant', 'unverified')
                                          and a.created_at >= w.week
                                          and a.created_at < w.week + interval '1 week'))
                 order by w.week)
          from generate_series(v_week - interval '11 weeks', v_week, interval '1 week') as w(week)),

      -- Where real people are, and where they arrived lately: the
      -- communities with real members, those gaining most first.
      'communities', coalesce((
        select jsonb_agg(to_jsonb(c) order by c.real_30d desc, c.real_count desc, c.name)
          from (
            select n.id, n.name, n.city, n.kind, coalesce(n.is_demo, false) as is_demo,
                   count(*) as real_count,
                   count(*) filter (where m.created_at > now() - interval '30 days') as real_30d
              from public.community_members m
              join real_users r on r.id = m.user_id
              join public.neighborhoods n on n.id = m.community_id
             group by n.id
             order by 7 desc, 6 desc, n.name
             limit 12
          ) c
      ), '[]'::jsonb)
    )
  );
end;
$$;

revoke all on function public.admin_user_growth() from public, anon;
grant execute on function public.admin_user_growth() to authenticated;
