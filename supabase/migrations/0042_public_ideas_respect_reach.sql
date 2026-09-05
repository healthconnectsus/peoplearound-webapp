-- Peoplearound — 0042 the public teaser must respect reach
--
-- The bug: `public_ideas` (migration 0012) runs with security_invoker = off,
-- which is what lets it serve the logged-out landing page at all — but it
-- selected EVERY non-archived project. So the titles of projects whose
-- author chose "my neighborhood only" were readable by anyone on the
-- internet, with no account. 24 of 35 live projects were in that state.
--
-- That contradicts the promise the whole product rests on: reach is
-- enforced in the database, not in the interface. A neighbor who picks
-- "neighborhood" is told strangers cannot see it. They could.
--
-- The fix: the public view shows only projects whose author chose
-- 'global' — "open to anywhere" is the one reach that consents to being
-- found by someone who isn't a member yet. Everything else is counted, not
-- quoted (see public_pulse below), so the landing page can still show signs
-- of life without publishing anyone's content.
--
-- Idempotent.

create or replace view public.public_ideas
with (security_invoker = off) as
  select
    p.id,
    p.title,
    p.category,
    p.state,
    p.created_at,
    (select count(*)::int from public.stars s where s.project_id = p.id)
      as star_count
  from public.projects p
  where p.state <> 'archived'
    and p.reach = 'global'
  order by p.created_at desc
  limit 60;

grant select on public.public_ideas to anon, authenticated;

-- Aggregate signs of life: numbers only, never a title, never a person.
-- Safe to expose anonymously because a count cannot identify a project,
-- a neighborhood or a neighbor.
create or replace view public.public_pulse
with (security_invoker = off) as
  select
    (select count(*)::int from public.projects
      where state <> 'archived') as projects,
    (select count(*)::int from public.neighborhoods) as communities,
    (select count(*)::int from public.profiles) as neighbors;

grant select on public.public_pulse to anon, authenticated;
