-- Peoplearound — 0070 the /people feed without a round trip for its ids
--
-- /people is the slowest page on the site, and it waits on three requests
-- in a row: the frame's shell_state() (which says which communities are
-- yours), then a query for the ids of every project in those communities,
-- then feed_material() for those ids. The middle request does nothing but
-- hand the database back a list it could have made itself — and a request
-- in a chain costs a full round trip, plus one more draw from the tail
-- latency, on every load of the page.
--
-- This takes the community ids and resolves them to projects inside the
-- same statement, then hands them to feed_material() exactly as the page
-- did. The feed's rules (the 200 most recent, which stars and teams and
-- events come along) stay in one place, feed_material() from 0060,
-- untouched.
--
-- The same answer as the two requests it replaces: non-archived projects
-- whose neighborhood_id is one of the given communities (projects live in
-- communities by neighborhood_id since 0011), read under the caller's
-- row-level security. The one difference is a limit that no longer exists:
-- the id query went through the API, which returns at most 1000 rows.
--
-- SECURITY INVOKER, like feed_material(). Idempotent.

create or replace function public.feed_material_for_communities(
  p_since timestamptz,
  p_community_ids uuid[],
  p_limit integer default 200
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select public.feed_material(
    p_since,
    array(
      select p.id
        from public.projects p
       where p.neighborhood_id = any (p_community_ids)
         and p.state <> 'archived'::project_state
    ),
    p_limit
  );
$$;

revoke all on function public.feed_material_for_communities(timestamptz, uuid[], integer) from public, anon;
grant execute on function public.feed_material_for_communities(timestamptz, uuid[], integer) to authenticated;
