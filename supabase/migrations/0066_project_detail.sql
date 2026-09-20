-- Peoplearound — 0066 a project page in one request
--
-- `/projects/[id]` is the page where people actually join a project and log
-- help — the one screen the whole product exists to produce. Migration
-- 0062 already took its badge block from six requests to one. What is left
-- is nine more: the project itself, its stars, its team, the build log, the
-- gardener's private nudge, whether you have already flagged it, the
-- contribution record, the events, and the neighborhood's other located
-- projects for the map.
--
-- They run together, so this is not about queueing — an earlier commit
-- already fixed that. It is about how many separate draws the page takes
-- from the database's tail latency. Measured from inside the serverless
-- function, roughly one read in twenty-five takes between a third of a
-- second and two seconds; at nine draws a page meets one on about a third of
-- all loads, at one draw it is nine times rarer.
--
-- Two things this preserves exactly, because they are load-bearing:
--
--   * `reconcile_contributions` runs BEFORE the contributions are read. It
--     is what promotes pending help to confirmed — including the seven-day
--     founder-bypass window — so reading first would show a state that is
--     about to change. Hence plpgsql and `perform`, rather than a CTE whose
--     evaluation order is not guaranteed.
--   * the function is VOLATILE, not STABLE, because of that write. Marking
--     it stable would be a lie the planner is entitled to act on.
--
-- SECURITY INVOKER, so every table is read as the caller. In particular the
-- nudge (`project_nudges`, migration 0029) returns a row only to the
-- founder, and the flag returns only your own, exactly as before — the
-- policies do that, not this function.
--
-- Idempotent.

create or replace function public.project_detail(p_id uuid)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = public
as $$
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
$$;

revoke all on function public.project_detail(uuid) from public, anon;
grant execute on function public.project_detail(uuid) to authenticated;
