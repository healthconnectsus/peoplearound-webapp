-- Peoplearound — 0022 view trends
-- Daily view counts for the caller's OWN ideas, for the analytics page's
-- 30-day trend. Owner-only and aggregate: never exposes who viewed.
-- Idempotent.

create or replace function public.idea_view_daily(p_days int default 30)
returns table (day date, views int)
language sql
stable
security definer
set search_path = public
as $$
  select v.viewed_on, count(*)::int
  from public.project_views v
  join public.projects p on p.id = v.project_id
  where p.owner_id = auth.uid()
    and v.viewed_on > current_date - p_days
  group by v.viewed_on
  order by v.viewed_on;
$$;

revoke all on function public.idea_view_daily(int) from public;
revoke all on function public.idea_view_daily(int) from anon;
grant execute on function public.idea_view_daily(int) to authenticated;
