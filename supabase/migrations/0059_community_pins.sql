-- Peoplearound — 0059 count the neighbors in Postgres, not in Node
--
-- The map beside the feed shows one pin per community, captioned with how
-- many neighbors are in it. Building that caption looked like this:
--
--   supabase.from("profiles").select("neighborhood_id")   -- every row
--
-- — the whole profiles table, with no filter and no limit, shipped to the
-- serverless function on every `/people` load, so that a `for` loop could
-- tally it into a Map. Beside it, two more requests read `neighborhoods`:
-- one for the cluster pins, one for the group pins, differing only in a
-- `kind <> 'neighborhood'` filter that Postgres could have applied once.
--
-- This is the same mistake migration 0054 fixed for the Local Faves badge,
-- and the one ARCHITECTURE.md's "watch for unbounded selects" bullet is
-- about. It is invisible at 221 profiles. At a hundred thousand it is a
-- hundred thousand rows crossing the wire to produce eight numbers, on the
-- busiest page in the product.
--
-- One call now returns every located community with its headcount already
-- counted. Three requests become one, and the largest table in the database
-- stops being read in full to render a caption.
--
-- SECURITY INVOKER: every table is read as the caller under the same
-- row-level security as the queries it replaces, so the pins and counts are
-- exactly what that person could already see.
--
-- Idempotent.

create or replace function public.community_pins()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'city', c.city,
        'kind', c.kind,
        'center_lat', c.center_lat,
        'center_lng', c.center_lng,
        'members', c.members
      )
      order by c.name
    ),
    '[]'::jsonb
  )
  from (
    select
      n.id, n.name, n.city, n.kind, n.center_lat, n.center_lng,
      (select count(*)::integer
         from public.profiles p
        where p.neighborhood_id = n.id) as members
      from public.neighborhoods n
     where n.center_lat is not null
       and n.center_lng is not null
     order by n.name
     limit 200
  ) c;
$$;

revoke all on function public.community_pins() from public, anon;
grant execute on function public.community_pins() to authenticated;
