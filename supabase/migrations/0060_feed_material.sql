-- Peoplearound — 0060 the feed's raw material in one request
--
-- `loadFeedCards` builds every project card on `/people`, `/explore` and
-- `/ideas`. It needs five things — the projects, their stars, their accepted
-- members, their upcoming events, and the contributions confirmed this month
-- — and asks for them as five separate API requests. They already run
-- together rather than in a queue, so the wall-clock cost is one round trip,
-- but the *tail* cost is not: measured from inside the serverless function,
-- about one read in twenty-five to the database API takes between a third of
-- a second and two seconds, and a page is as slow as its slowest read. Five
-- draws from that lottery per feed is five chances to lose it.
--
-- So: one request returning all five as one JSON document. The assembly —
-- which "beat" each card shows, whether it is hot, who is on the team —
-- stays in TypeScript where it is readable and tested; only the fetching
-- moves. That is deliberate. A version of this that computed the beats in
-- SQL would save nothing further and would be much harder to change.
--
-- SECURITY INVOKER, so every table is read as the caller under exactly the
-- row-level security the five queries had. The embedded profiles, rsvps and
-- project titles are subqueries against the same policies PostgREST would
-- have applied to its embeds.
--
-- Two arguments are passed in rather than computed here:
--   p_project_ids  null means "every project you can see" (Explore and
--                  Projects); a list narrows to your communities (People
--                  around). An empty array is not the same as null and the
--                  caller skips this function entirely for it.
--   p_since        the "confirmed this month" cutoff. Passed so the function
--                  stays stable and the window has one definition, in
--                  `isoDaysAgo(30)`, next to the code that reads it.
--
-- p_limit is a new safety rail, not a behaviour change: the projects query
-- had no limit at all, so Explore read every non-archived project in the
-- database on every load. At 35 projects that is invisible; the cap is there
-- for the day it is not.
--
-- Idempotent.

create or replace function public.feed_material(
  p_since timestamptz,
  p_project_ids uuid[] default null,
  p_limit integer default 200
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with scope as (
    select p.*
      from public.projects p
     where p.state <> 'archived'::project_state
       and (p_project_ids is null or p.id = any (p_project_ids))
     order by p.created_at desc
     limit least(greatest(coalesce(p_limit, 200), 1), 1000)
  )
  select jsonb_build_object(
    'projects', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', s.id, 'owner_id', s.owner_id, 'title', s.title,
          'description', s.description, 'category', s.category,
          'state', s.state, 'help', s.help, 'reach', s.reach,
          'photo_url', s.photo_url, 'when_text', s.when_text,
          'lat', s.lat, 'lng', s.lng,
          'neighborhood_id', s.neighborhood_id,
          'created_at', s.created_at, 'updated_at', s.updated_at,
          'owner', (
            select jsonb_build_object(
              'display_name', o.display_name, 'avatar_url', o.avatar_url)
              from public.profiles o where o.id = s.owner_id
          ),
          'neighborhood', (
            select jsonb_build_object('name', n.name, 'city', n.city)
              from public.neighborhoods n where n.id = s.neighborhood_id
          )
        )
        order by s.created_at desc
      ) from scope s
    ), '[]'::jsonb),

    'stars', coalesce((
      select jsonb_agg(jsonb_build_object(
               'project_id', st.project_id,
               'created_at', st.created_at,
               'user_id', st.user_id))
        from public.stars st
       where st.project_id in (select id from scope)
    ), '[]'::jsonb),

    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
               'project_id', m.project_id,
               'status', m.status,
               'created_at', m.created_at,
               'profile', (select jsonb_build_object('display_name', pr.display_name)
                             from public.profiles pr where pr.id = m.user_id)))
        from public.memberships m
       where m.status = 'accepted'
         and m.project_id in (select id from scope)
    ), '[]'::jsonb),

    -- Ordered and capped exactly as the query it replaces: soonest first,
    -- thirty across the whole feed rather than thirty per project.
    'events', coalesce((
      select jsonb_agg(to_jsonb(e) order by e.starts_at)
        from (
          select
            ev.id, ev.project_id, ev.title, ev.starts_at, ev.place,
            ev.created_at,
            coalesce((
              select jsonb_agg(jsonb_build_object('user_id', r.user_id))
                from public.rsvps r where r.event_id = ev.id
            ), '[]'::jsonb) as rsvps,
            (select jsonb_build_object('title', pj.title)
               from public.projects pj where pj.id = ev.project_id) as project
          from public.events ev
         where ev.project_id in (select id from scope)
         order by ev.starts_at
         limit 30
        ) e
    ), '[]'::jsonb),

    'confirmed', coalesce((
      select jsonb_agg(jsonb_build_object(
               'project_id', c.project_id,
               'confirmed_at', c.confirmed_at,
               'contributor', (select jsonb_build_object('display_name', cp.display_name)
                                 from public.profiles cp where cp.id = c.contributor_id)))
        from public.contributions c
       where c.status = 'confirmed'
         and c.confirmed_at >= p_since
         and c.project_id in (select id from scope)
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.feed_material(timestamptz, uuid[], integer) from public, anon;
grant execute on function public.feed_material(timestamptz, uuid[], integer) to authenticated;
