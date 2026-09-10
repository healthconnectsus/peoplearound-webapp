-- Peoplearound — 0054 count the faves in Postgres, not in Node
--
-- The rail badge next to "Local Faves" is one number: how many projects have
-- at least one star. It was produced by selecting EVERY star row the viewer
-- can see and counting the distinct project ids in JavaScript — on every page
-- load, because the badge lives in the shell.
--
--   supabase.from('stars').select('project_id')     -- no filter, no limit
--
-- Today that is a few dozen rows. It grows with every star anyone ever gives,
-- it is shipped over the wire in full to be thrown away, and nothing about it
-- gets slower in a way anyone would notice until it is already a problem.
--
-- SECURITY INVOKER (the default) matters here: row-level security on `stars`
-- applies to the caller exactly as it did before, so the number counts the
-- same rows the old query could see. This is a change of where the counting
-- happens, not of what is counted.
--
-- Idempotent.

create or replace function public.visible_faves_count()
returns integer
language sql
stable
security invoker
set search_path = public
as $$
  select count(distinct project_id)::int from public.stars;
$$;

revoke all on function public.visible_faves_count() from public, anon;
grant execute on function public.visible_faves_count() to authenticated;
