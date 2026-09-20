-- Peoplearound — 0063 the last two places that read every star
--
-- Migration 0054 moved the Local Faves *badge* into Postgres, because the
-- sidebar was selecting every star row a viewer could see and counting them
-- in Node on every page load. The same pattern survived in two more places,
-- and this is the rest of it.
--
--   /faves    read every non-archived project AND every star row, joined
--             them in memory, sorted, and kept twenty. Two unbounded reads
--             to render a list with a hard limit on it.
--   /profile  read every star row for two answers it could have asked for:
--             how many stars each of *my* projects has, and which projects
--             *I* starred.
--
-- Neither is slow today — there are 99 stars. Both are O(all stars) per page
-- view, which is the shape of thing that is fine until the week it is not,
-- and by then it is on the page people visit most.
--
-- SECURITY INVOKER, so `projects`, `stars` and `profiles` are read under the
-- caller's row-level security exactly as the queries they replace: a star on
-- a project you cannot see was already invisible and still is.
--
-- Idempotent.

-- The Local Faves board: the most-starred projects the caller can see,
-- ranked and cut to size in Postgres.
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
      p.neighborhood_id, p.created_at, p.owner_id,
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

-- The two star answers a profile page needs, without reading the table.
create or replace function public.profile_stars(p_user uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    -- Projects this person starred: their Faves list.
    'mine', coalesce((
      select jsonb_agg(s.project_id)
        from public.stars s where s.user_id = p_user
    ), '[]'::jsonb),
    -- How many stars each project they founded has collected.
    'counts', coalesce((
      select jsonb_object_agg(p.id::text, (
               select count(*)::integer
                 from public.stars s where s.project_id = p.id))
        from public.projects p
       where p.owner_id = p_user
         and p.state <> 'archived'::project_state
    ), '{}'::jsonb)
  );
$$;

revoke all on function public.profile_stars(uuid) from public, anon;
grant execute on function public.profile_stars(uuid) to authenticated;
