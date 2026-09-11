-- Peoplearound — 0056 which imported-events city a community belongs to
--
-- The events page is getting a community filter, and it has to narrow both
-- halves of the page: the neighbor-led events (which hang off projects, and
-- carry a neighborhood id already) and the imported local calendars (which
-- hang off `event_cities`).
--
-- The second half needs a mapping from a community to its city, and a normal
-- session cannot read `event_cities` at all — migration 0045 revoked it from
-- `anon` and `authenticated`, because an import queue is operational state
-- rather than anything a neighbor should see. So the page cannot do the join
-- itself, and embedding the table in a PostgREST query fails for the same
-- reason.
--
-- This returns the one id needed and nothing else. That id is not a
-- capability: reading the listings still goes through `can_read_city_events`,
-- so knowing a city's id gets you no rows you could not already see. It is
-- restricted to communities the caller actually belongs to anyway, because
-- there is no reason for the answer to be broader than the question.
--
-- Idempotent.

create or replace function public.event_city_for_community(p_community uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.id
    from public.neighborhoods n
    join public.event_cities c
      on c.city_key = public.event_city_key(n.city)
   where n.id = p_community
     and exists (
       select 1 from public.community_members m
        where m.community_id = n.id and m.user_id = auth.uid()
     )
   limit 1;
$$;

revoke all on function public.event_city_for_community(uuid) from public, anon;
grant execute on function public.event_city_for_community(uuid) to authenticated;
