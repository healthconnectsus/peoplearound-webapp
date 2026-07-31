-- Peoplearound — 0012 public ideas teaser
-- A safe, anonymous-readable view of current ideas for the logged-out
-- landing page: titles and counts only, no owner or location data.
-- The view runs with its owner's rights (security_invoker = off), which
-- is what lets it bypass the authenticated-only RLS on projects/stars.
-- Idempotent so it is safe to re-run.

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
  order by p.created_at desc
  limit 60;

grant select on public.public_ideas to anon, authenticated;
