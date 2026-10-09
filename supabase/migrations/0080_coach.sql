-- Peoplearound — 0080 the coach: what you need to know, before you go looking
--
-- A founder today has to go and look: open each project to see whether
-- anyone asked to join, open analytics to see whether anyone looked, open the
-- event to see whether the jobs are covered. Most people never do, and a
-- project dies quietly of nobody noticing it needed one small thing.
--
-- This is the material for a coach that notices for them. One document per
-- person: for every project they run, the numbers that say how it is going
-- this week against last (views, new stars), what is waiting on them (join
-- requests, help to accept), its next event and whether that event's jobs
-- are covered and its poster published, and how long it has been quiet. Plus
-- the events they are going to in the next three days, and — for someone
-- running nothing yet — how many jobs near them still need a person.
--
-- The rules that turn this into "do this next" live in TypeScript
-- (src/lib/coach.ts), where they are legible and change without a migration.
-- The same rules feed the home page, a project's own page, the analytics
-- page and a weekly notification, so all four always agree.
--
-- SECURITY DEFINER, because view counts are readable only through definer
-- functions (project_views has no policies by design — 0031). Every function
-- here is therefore scoped by hand to the caller's own projects:
--   my_coach()          your own document, keyed on auth.uid()
--   project_coach(id)   one project, and only if you run it (can_steward)
--   coach_material(id)  anyone's — service role only, for the weekly job
-- None of them returns another person's name, only counts.
--
-- Idempotent.

-- One project's coaching numbers. Internal: callable only by the definer
-- functions below, which decide whose projects may be asked about.
create or replace function public.coach_project_row(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', p.id,
    'title', p.title,
    'state', p.state,
    'created_at', p.created_at,
    'has_photo', p.photo_url is not null,
    'desc_len', char_length(coalesce(p.description, '')),
    'stars', (select count(*) from public.stars s where s.project_id = p.id),
    'stars_7d', (select count(*) from public.stars s
                  where s.project_id = p.id and s.created_at > now() - interval '7 days'),
    'views_7d', (select count(*) from public.project_views v
                  where v.project_id = p.id and v.viewed_on > current_date - 7),
    'views_prev_7d', (select count(*) from public.project_views v
                       where v.project_id = p.id
                         and v.viewed_on > current_date - 14
                         and v.viewed_on <= current_date - 7),
    'team', (select count(*) from public.memberships m
              where m.project_id = p.id and m.status = 'accepted'),
    'pending', (select count(*) from public.memberships m
                 where m.project_id = p.id and m.status = 'pending'),
    -- Help someone logged that is waiting for a steward to accept it.
    'logged', (select count(*) from public.contributions c
                where c.project_id = p.id and c.status = 'logged'),
    'confirmed', (select count(*) from public.contributions c
                   where c.project_id = p.id and c.status = 'confirmed'),
    'updates', (select count(*) from public.project_updates u where u.project_id = p.id),
    -- Quiet since: the last time anything visible happened on it.
    'last_activity_at', greatest(
      p.created_at,
      (select max(u.created_at) from public.project_updates u where u.project_id = p.id),
      (select max(e.created_at) from public.events e where e.project_id = p.id)
    ),
    'events_total', (select count(*) from public.events e where e.project_id = p.id),
    'events_published', (select count(*) from public.events e
                           where e.project_id = p.id and e.share_code is not null),
    'next_event', (
      select jsonb_build_object(
        'id', e.id,
        'title', e.title,
        'starts_at', e.starts_at,
        'published', e.share_code is not null,
        'going', (select count(*) from public.rsvps r where r.event_id = e.id),
        'jobs', (select count(*) from public.event_roles ro where ro.event_id = e.id),
        'open_spots', coalesce((
          select sum(greatest(0, ro.needed - (
                   select count(*) from public.event_role_signups s where s.role_id = ro.id)))
            from public.event_roles ro where ro.event_id = e.id
        ), 0))
        from public.events e
       where e.project_id = p.id
         and e.cancelled_at is null
         and e.starts_at > now() - interval '14 hours'
       order by e.starts_at
       limit 1
    ),
    -- The most recent event that has happened, within the last ten days.
    'last_event', (
      select jsonb_build_object(
        'id', e.id,
        'title', e.title,
        'starts_at', e.starts_at,
        'updates_since', (select count(*) from public.project_updates u
                           where u.project_id = p.id and u.created_at > e.starts_at))
        from public.events e
       where e.project_id = p.id
         and e.cancelled_at is null
         and e.starts_at <= now() - interval '14 hours'
         and e.starts_at > now() - interval '10 days'
       order by e.starts_at desc
       limit 1
    ),
    'has_nudge', exists (
      select 1 from public.project_nudges n
       where n.project_id = p.id and n.dismissed_at is null
    )
  )
    from public.projects p
   where p.id = p_id;
$$;

revoke all on function public.coach_project_row(uuid) from public, anon, authenticated;


-- Everything for one person. Service role only (the weekly job); people get
-- their own through my_coach().
create or replace function public.coach_material(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with mine as (
    select p.id, p.created_at
      from public.projects p
     where p.state <> 'archived'::project_state
       and (p.owner_id = p_user
            or exists (select 1 from public.memberships m
                        where m.project_id = p.id and m.user_id = p_user
                          and m.status = 'accepted' and m.role = 'co_organizer'))
  )
  select jsonb_build_object(
    'projects', coalesce((
      select jsonb_agg(public.coach_project_row(mine.id) order by mine.created_at desc)
        from mine
    ), '[]'::jsonb),

    -- Events you said you'd come to (or took a job at) in the next three
    -- days, on projects you do not run — your own are covered above.
    'going', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', e.id,
          'title', e.title,
          'starts_at', e.starts_at,
          'place', e.place,
          'job', (select ro.title from public.event_roles ro
                    join public.event_role_signups s on s.role_id = ro.id
                   where ro.event_id = e.id and s.user_id = p_user
                   limit 1))
        order by e.starts_at)
        from public.events e
       where e.cancelled_at is null
         and e.starts_at > now() - interval '2 hours'
         and e.starts_at < now() + interval '3 days'
         and e.project_id not in (select id from mine)
         and (exists (select 1 from public.rsvps r where r.event_id = e.id and r.user_id = p_user)
              or exists (select 1 from public.event_role_signups s
                           join public.event_roles ro on ro.id = s.role_id
                          where ro.event_id = e.id and s.user_id = p_user))
    ), '[]'::jsonb),

    -- For someone who runs nothing yet: open job spots on events in their
    -- communities over the next two weeks — the easiest way in.
    'open_spots_near', coalesce((
      select sum(greatest(0, ro.needed - (
               select count(*) from public.event_role_signups s where s.role_id = ro.id)))
        from public.event_roles ro
        join public.events e on e.id = ro.event_id
        join public.projects pr on pr.id = e.project_id
       where e.cancelled_at is null
         and e.starts_at > now()
         and e.starts_at < now() + interval '14 days'
         and pr.neighborhood_id in (
           select cm.community_id from public.community_members cm where cm.user_id = p_user
           union
           select pf.neighborhood_id from public.profiles pf where pf.id = p_user)
    ), 0)
  );
$$;

revoke all on function public.coach_material(uuid) from public, anon, authenticated;
grant execute on function public.coach_material(uuid) to service_role;


/** Your own coaching document. */
create or replace function public.my_coach()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when auth.uid() is null then null
              else public.coach_material(auth.uid()) end;
$$;

revoke all on function public.my_coach() from public, anon;
grant execute on function public.my_coach() to authenticated;


/** One project's numbers — only for someone who runs it; null otherwise. */
create or replace function public.project_coach(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when public.can_steward(p_id, auth.uid())
              then public.coach_project_row(p_id)
              else null end;
$$;

revoke all on function public.project_coach(uuid) from public, anon;
grant execute on function public.project_coach(uuid) to authenticated;


-- Who gets the weekly insight: real people (0072) who run something, and
-- who have not had one in the last six days. Demo and test accounts never.
create or replace function public.insight_recipients()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select distinct x.uid
    from (
      select p.owner_id as uid
        from public.projects p
       where p.state <> 'archived'::project_state
      union
      select m.user_id
        from public.memberships m
        join public.projects p on p.id = m.project_id
       where m.status = 'accepted' and m.role = 'co_organizer'
         and p.state <> 'archived'::project_state
    ) x
    join auth.users u on u.id = x.uid
   where public.account_kind(u.email, u.email_confirmed_at, u.last_sign_in_at) = 'real'
     and not exists (
       select 1 from public.notifications n
        where n.user_id = x.uid
          and n.kind = 'insight'
          and n.created_at > now() - interval '6 days'
     );
$$;

revoke all on function public.insight_recipients() from public, anon, authenticated;
grant execute on function public.insight_recipients() to service_role;


-- A new kind of notification: the weekly insight.
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('join_request', 'joined', 'star', 'contribution',
                  'confirmed', 'event', 'insight'));


-- project_detail (0066) carries the coach for stewards, so a project page
-- gets its numbers without a second request. Restated from the live
-- definition with that one key added.
CREATE OR REPLACE FUNCTION public.project_detail(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  result jsonb;
begin
  -- Apply any pending confirmations first (server-side, idempotent).
  perform public.reconcile_contributions(p_id);

  select jsonb_build_object(
    'project', (
      select jsonb_build_object(
        'id', p.id, 'owner_id', p.owner_id, 'title', p.title,
        'description', p.description, 'category', p.category,
        'state', p.state, 'help', p.help, 'reach', p.reach,
        'photo_url', p.photo_url,
        'photo_credit_name', p.photo_credit_name,
        'photo_credit_url', p.photo_credit_url,
        'when_text', p.when_text, 'lat', p.lat, 'lng', p.lng,
        'neighborhood_id', p.neighborhood_id,
        'created_at', p.created_at, 'updated_at', p.updated_at,
        'owner', (
          select jsonb_build_object(
            'display_name', o.display_name, 'avatar_url', o.avatar_url)
            from public.profiles o where o.id = p.owner_id
        ),
        'neighborhood', (
          select jsonb_build_object(
            'name', n.name, 'city', n.city,
            'center_lat', n.center_lat, 'center_lng', n.center_lng)
            from public.neighborhoods n where n.id = p.neighborhood_id
        )
      )
      from public.projects p where p.id = p_id
    ),

    -- Stars: the count, whether you are among them, and who and when for
    -- the history timeline.
    'stars', coalesce((
      select jsonb_agg(jsonb_build_object(
               'user_id', s.user_id,
               'created_at', s.created_at,
               'profile', (select jsonb_build_object('display_name', sp.display_name)
                             from public.profiles sp where sp.id = s.user_id))
             order by s.created_at)
        from public.stars s where s.project_id = p_id
    ), '[]'::jsonb),

    -- Memberships: requests and accepted collaborators.
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
               'user_id', m.user_id, 'status', m.status, 'role', m.role,
               'created_at', m.created_at,
               'profile', (select jsonb_build_object(
                             'display_name', mp.display_name,
                             'avatar_url', mp.avatar_url)
                             from public.profiles mp where mp.id = m.user_id))
             order by m.created_at)
        from public.memberships m where m.project_id = p_id
    ), '[]'::jsonb),

    -- The build log — founder and teammate progress notes.
    'updates', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', u.id, 'author_id', u.author_id, 'body', u.body,
               'photo_url', u.photo_url, 'created_at', u.created_at,
               'author', (select jsonb_build_object('display_name', ap.display_name)
                            from public.profiles ap where ap.id = u.author_id))
             order by u.created_at desc)
        from public.project_updates u where u.project_id = p_id
    ), '[]'::jsonb),

    -- A private word from the gardener, if this project has gone quiet.
    'nudge', (
      select jsonb_build_object(
               'kind', g.kind, 'body', g.body, 'dismissed_at', g.dismissed_at)
        from public.project_nudges g where g.project_id = p_id limit 1
    ),

    -- Have I already reported this one? RLS returns only my own flag row.
    'flagged', exists (
      select 1 from public.project_flags f
       where f.project_id = p_id and f.user_id = auth.uid()
    ),

    'contributions', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', c.id, 'contributor_id', c.contributor_id,
               'type', c.type, 'description', c.description,
               'status', c.status, 'created_at', c.created_at,
               'confirmed_at', c.confirmed_at,
               'contributor', (select jsonb_build_object('display_name', cp.display_name)
                                 from public.profiles cp where cp.id = c.contributor_id),
               'attestations', coalesce((
                 select jsonb_agg(jsonb_build_object(
                          'attester_id', a.attester_id,
                          'created_at', a.created_at,
                          'attester', (select jsonb_build_object('display_name', ap2.display_name)
                                         from public.profiles ap2 where ap2.id = a.attester_id)))
                   from public.attestations a where a.contribution_id = c.id
               ), '[]'::jsonb))
             order by c.created_at desc)
        from public.contributions c where c.project_id = p_id
    ), '[]'::jsonb),

    -- Events — physical coordination, with each event's joining signals.
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', e.id, 'project_id', e.project_id, 'title', e.title,
               'starts_at', e.starts_at, 'place', e.place,
               'photo_url', e.photo_url, 'created_at', e.created_at,
               'rsvps', coalesce((
                 select jsonb_agg(jsonb_build_object('user_id', r.user_id))
                   from public.rsvps r where r.event_id = e.id
               ), '[]'::jsonb))
             order by e.starts_at)
        from public.events e where e.project_id = p_id
    ), '[]'::jsonb),

    -- An unlocated project borrows its neighborhood's map, so the column is
    -- a place rather than a blank. Only fetched when it has no pin of its
    -- own, which is the only time the page uses it.
    -- How it is going, for whoever runs it (0080). Null for everyone else.
    'coach', public.project_coach(p_id),

    'nearby', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', q.id, 'title', q.title, 'category', q.category,
               'state', q.state, 'lat', q.lat, 'lng', q.lng))
        from (
          select np.id, np.title, np.category, np.state, np.lat, np.lng
            from public.projects np
            join public.projects self on self.id = p_id
           where self.lat is null
             and self.neighborhood_id is not null
             and np.neighborhood_id = self.neighborhood_id
             and np.lat is not null
           limit 40
        ) q
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$function$
;
