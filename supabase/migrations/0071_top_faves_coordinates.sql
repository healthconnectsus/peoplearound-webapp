-- Peoplearound — 0071 Local Faves carry their coordinates
--
-- /faves drew its map by asking for the same twenty projects a second time,
-- only to learn where they are — a request that could not start until
-- top_faves() (0063) had answered, so every load of the page paid two round
-- trips in a row for one list. The coordinates now come with the list, and
-- the page builds its pins from the rows it already holds.
--
-- The function is otherwise exactly 0063's: same ranking, same limit, same
-- row-level security (SECURITY INVOKER). Two keys are added to each project,
-- nothing is removed, so the code still deployed while this is applied
-- simply ignores them.
--
-- Idempotent.

create or replace function public.top_faves(p_limit integer default 20)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', f.id,
        'title', f.title,
        'description', f.description,
        'category', f.category,
        'state', f.state,
        'neighborhood_id', f.neighborhood_id,
        'created_at', f.created_at,
        'lat', f.lat,
        'lng', f.lng,
        'stars', f.stars,
        'owner', (
          select jsonb_build_object('display_name', o.display_name)
            from public.profiles o where o.id = f.owner_id
        ),
        'neighborhood', (
          select jsonb_build_object('name', n.name, 'city', n.city)
            from public.neighborhoods n where n.id = f.neighborhood_id
        )
      )
      order by f.stars desc, f.created_at desc
    ),
    '[]'::jsonb
  )
  from (
    select
      p.id, p.title, p.description, p.category, p.state,
      p.neighborhood_id, p.created_at, p.owner_id, p.lat, p.lng,
      (select count(*)::integer from public.stars s where s.project_id = p.id)
        as stars
      from public.projects p
     where p.state <> 'archived'::project_state
       and exists (select 1 from public.stars s where s.project_id = p.id)
     order by (select count(*) from public.stars s where s.project_id = p.id) desc,
              p.created_at desc
     limit least(greatest(coalesce(p_limit, 20), 1), 100)
  ) f;
$$;

revoke all on function public.top_faves(integer) from public, anon;
grant execute on function public.top_faves(integer) to authenticated;
