-- Peoplearound — 0069 the profile page in one request
--
-- /profile is the heaviest page left: 26 database statements per load, from
-- about thirteen requests in two waves. First the profile, your ideas and the
-- star counts; then — because the faves list needed the starred ids from the
-- first wave — ten more: the starred projects, four counts, idea views, the
-- reputation record, the events, your RSVPs and the badge material.
--
-- The arithmetic is the same as 0066's. Every separate request is a separate
-- draw from the database's tail latency (roughly one read in twenty-five
-- takes a third of a second to two seconds, measured from the functions),
-- and the second wave could not start until the slowest of the first had
-- answered. This returns everything as one document. The frame's
-- shell_state() still runs beside it, as on every page, and costs this page
-- nothing extra.
--
-- Everything is read the way the page read it, with one deliberate change
-- and one cosmetic one:
--
--   * events. The page read the 100 EARLIEST events it could see and then
--     kept the ones you run or said you're joining, so once the site passes
--     a hundred events, yours would start silently falling off your own
--     profile, the newest first. This reads your events directly. With
--     fifteen events on the site today, the two give the same answer.
--   * faves come back most recently starred first; the page read them in no
--     particular order.
--
-- Reuses what already exists rather than restating it: profile_stars()
-- (0063), badge_material() (0062) and idea_view_counts(), so the rules for
-- stars, badges and views each still live in one place.
--
-- SECURITY INVOKER: every table is read under the caller's row-level
-- security, exactly as the requests it replaces. idea_view_counts() keeps its
-- own SECURITY DEFINER, as before — it only ever counts views of the
-- caller's own ideas. Keyed on auth.uid(): this page is only ever your own.
--
-- Idempotent.

create or replace function public.profile_page()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with me as (
    select p.id, p.neighborhood_id
      from public.profiles p
     where p.id = auth.uid()
  )
  select jsonb_build_object(
    'profile', (
      select jsonb_build_object(
        'display_name', p.display_name,
        'created_at', p.created_at,
        'bio', p.bio,
        'pronouns', p.pronouns,
        'show_pronouns', p.show_pronouns,
        'website', p.website,
        'hometown', p.hometown,
        'avatar_url', p.avatar_url,
        'cover_url', p.cover_url,
        'neighborhood_id', p.neighborhood_id,
        'neighborhood', (
          select jsonb_build_object('name', n.name, 'city', n.city)
            from public.neighborhoods n where n.id = p.neighborhood_id
        )
      )
      from public.profiles p where p.id = auth.uid()
    ),

    -- Your ideas, newest first. lat/lng ride along for the map.
    'own', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', pr.id, 'title', pr.title, 'category', pr.category,
          'state', pr.state, 'lat', pr.lat, 'lng', pr.lng,
          'created_at', pr.created_at,
          'owner', (
            select jsonb_build_object('display_name', o.display_name)
              from public.profiles o where o.id = pr.owner_id
          )
        )
        order by pr.created_at desc
      )
      from public.projects pr
      where pr.owner_id = auth.uid()
        and pr.state <> 'archived'::project_state
    ), '[]'::jsonb),

    -- Which projects you starred, and how many stars each of yours has.
    'stars', public.profile_stars(auth.uid()),

    -- The projects behind those stars: your Faves.
    'faved', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', pr.id, 'title', pr.title, 'category', pr.category,
          'state', pr.state, 'lat', pr.lat, 'lng', pr.lng,
          'created_at', pr.created_at,
          'owner', (
            select jsonb_build_object('display_name', o.display_name)
              from public.profiles o where o.id = pr.owner_id
          )
        )
        order by s.created_at desc
      )
      from public.stars s
      join public.projects pr on pr.id = s.project_id
      where s.user_id = auth.uid()
        and pr.state <> 'archived'::project_state
    ), '[]'::jsonb),

    -- The dashboard's four counts.
    'teams_joined', (
      select count(*) from public.memberships m
       where m.user_id = auth.uid() and m.status = 'accepted'
    ),
    'help_confirmed', (
      select count(*) from public.contributions c
       where c.contributor_id = auth.uid() and c.confirmed_at is not null
    ),
    'messages_sent', (
      select count(*) from public.messages m where m.sender_id = auth.uid()
    ),
    'brought', (
      select count(*) from public.profiles b where b.invited_by = auth.uid()
    ),

    -- Views of your ideas (owner-only, deduped per viewer per day).
    'idea_views', coalesce((
      select jsonb_agg(
        jsonb_build_object('project_id', v.project_id, 'views', v.views)
      )
      from public.idea_view_counts() v
    ), '[]'::jsonb),

    -- The confirmed record reputation is assembled from (lib/reputation.ts).
    'reputation', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', c.id, 'type', c.type, 'project_id', c.project_id,
          'project', (
            select jsonb_build_object('category', pr.category)
              from public.projects pr where pr.id = c.project_id
          ),
          'attestations', coalesce((
            select jsonb_agg(jsonb_build_object('attester_id', a.attester_id))
              from public.attestations a where a.contribution_id = c.id
          ), '[]'::jsonb)
        )
      )
      from public.contributions c
      where c.contributor_id = auth.uid() and c.status = 'confirmed'
    ), '[]'::jsonb),

    -- Events you run or are joining, earliest first.
    'events', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', e.id, 'title', e.title, 'starts_at', e.starts_at,
          'place', e.place, 'project_id', e.project_id,
          'project', (
            select jsonb_build_object(
                     'title', pr.title, 'lat', pr.lat, 'lng', pr.lng,
                     'owner_id', pr.owner_id)
              from public.projects pr where pr.id = e.project_id
          )
        )
        order by e.starts_at
      )
      from (
        select e.*
          from public.events e
         where e.id in (select r.event_id from public.rsvps r
                         where r.user_id = auth.uid())
            or e.project_id in (select pr.id from public.projects pr
                                 where pr.owner_id = auth.uid())
         order by e.starts_at
         limit 200
      ) e
    ), '[]'::jsonb),
    'rsvps', coalesce((
      select jsonb_agg(r.event_id)
        from public.rsvps r where r.user_id = auth.uid()
    ), '[]'::jsonb),

    -- Badge rules stay in lib/badges.ts; this is only their inputs.
    'badges', public.badge_material(auth.uid(), (select me.neighborhood_id from me))
  );
$$;

revoke all on function public.profile_page() from public, anon;
grant execute on function public.profile_page() to authenticated;
