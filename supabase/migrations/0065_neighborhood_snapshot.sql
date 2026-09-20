-- Peoplearound — 0065 the neighborhood block on People around, in one read
--
-- Under the feed, `/people` shows the place that is yours: who founded it,
-- how many neighbors are in it, who they are, and how many of them you
-- brought. Four requests, all about one community:
--
--   community_members  first ten by join order   (founding neighbors)
--   community_members  count                     (is this still founding era)
--   profiles           count where invited_by=me (how many you brought)
--   profiles           first hundred in the place (the neighbor list)
--
-- One now. Each is small; what four bought was four more draws from the
-- database's tail latency on the page people land on.
--
-- `community_directory()` also gains a second number. It already counts
-- memberships; the map's people-clusters want the other count — neighbors
-- whose *profile* names this place — which until now came from a separate
-- function. Returning both lets one call feed the directory and the map,
-- and `community_pins()` from migration 0059 stops being called. It is left
-- in place rather than dropped: it is three days old, something may still
-- hold a reference, and an unused function costs nothing.
--
-- SECURITY INVOKER throughout. `brought` is keyed on auth.uid() rather than
-- an argument, because "how many people did X bring" is not a question this
-- product answers about anyone but yourself.
--
-- Idempotent.

create or replace function public.community_directory()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', d.id,
        'name', d.name,
        'city', d.city,
        'kind', d.kind,
        'description', d.description,
        'center_lat', d.center_lat,
        'center_lng', d.center_lng,
        'members', d.members,
        'residents', d.residents
      )
      order by d.name
    ),
    '[]'::jsonb
  )
  from (
    select
      n.id, n.name, n.city, n.kind, n.description,
      n.center_lat, n.center_lng,
      -- People who joined this community.
      (select count(*)::integer
         from public.community_members cm
        where cm.community_id = n.id) as members,
      -- People whose profile calls this their place — what the map's
      -- headcount pin has always counted.
      (select count(*)::integer
         from public.profiles p
        where p.neighborhood_id = n.id) as residents
      from public.neighborhoods n
     order by n.name
     limit 500
  ) d;
$$;

revoke all on function public.community_directory() from public, anon;
grant execute on function public.community_directory() to authenticated;

create or replace function public.neighborhood_snapshot(p_community uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    -- The first ten members, by join order. Being among them is what makes
    -- someone a founding neighbor — a permanent, derived fact, never a score.
    'founding', coalesce((
      select jsonb_agg(f.user_id order by f.created_at)
        from (
          select cm.user_id, cm.created_at
            from public.community_members cm
           where cm.community_id = p_community
           order by cm.created_at
           limit 10
        ) f
    ), '[]'::jsonb),

    'neighbors', (
      select count(*)::integer from public.community_members cm
       where cm.community_id = p_community
    ),

    -- How many neighbors you brought here. Yours only, by construction.
    'brought', (
      select count(*)::integer from public.profiles p
       where p.invited_by = auth.uid()
    ),

    -- The people, oldest first, so the founders of a place read first.
    'people', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.created_at)
        from (
          select p.id, p.display_name, p.avatar_url, p.created_at
            from public.profiles p
           where p.neighborhood_id = p_community
           order by p.created_at
           limit 100
        ) x
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.neighborhood_snapshot(uuid) from public, anon;
grant execute on function public.neighborhood_snapshot(uuid) to authenticated;
