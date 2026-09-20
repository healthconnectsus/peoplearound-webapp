-- Peoplearound — 0061 the community directory, counted in Postgres
--
-- Explore lists every community with two numbers that say whether it is
-- alive: how many people are in it, and how much is being built there. The
-- second comes from projects the page has already loaded. The first was
-- built like this:
--
--   supabase.from("community_members").select("community_id")   -- every row
--
-- — the entire membership table, unfiltered and unlimited, shipped to the
-- serverless function so a `for` loop could tally it into a Map. The same
-- mistake as the profiles scan fixed in 0059, on the same page load, one
-- table over. It is also the third separate read of `neighborhoods` in that
-- render.
--
-- `/people` reads the same table with `select("*")`, which additionally
-- fetches `boundary` — a column that is empty today and will hold a polygon
-- per community tomorrow, on a page that only ever renders the name.
--
-- One call now returns every community with its headcount already counted,
-- and never selects the geometry. Two pages, four requests, one query.
--
-- SECURITY INVOKER: `neighborhoods` and `community_members` are read as the
-- caller under the same policies as the queries it replaces, so the list and
-- the counts are exactly what that person could already see.
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
        'members', d.members
      )
      order by d.name
    ),
    '[]'::jsonb
  )
  from (
    select
      n.id, n.name, n.city, n.kind, n.description,
      n.center_lat, n.center_lng,
      (select count(*)::integer
         from public.community_members cm
        where cm.community_id = n.id) as members
      from public.neighborhoods n
     order by n.name
     limit 500
  ) d;
$$;

revoke all on function public.community_directory() from public, anon;
grant execute on function public.community_directory() to authenticated;
