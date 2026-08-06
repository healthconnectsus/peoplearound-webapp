-- Peoplearound — 0020 project views (private analytics)
-- Counts how many neighbors looked at an idea, privately and humanely:
--   • deduped per viewer per day (a refresh isn't a view)
--   • the owner's own visits never count
--   • raw rows are invisible to every client — no policies at all; only the
--     two definer functions below touch the table, and they return COUNTS,
--     never who. Numbers stay quiet and owner-only (UX: restraint with
--     metrics; no public view counts on cards).
-- Idempotent.

create table if not exists public.project_views (
  project_id uuid not null references public.projects (id) on delete cascade,
  viewer_id uuid not null references public.profiles (id) on delete cascade,
  viewed_on date not null default current_date,
  primary key (project_id, viewer_id, viewed_on)
);

alter table public.project_views enable row level security;
-- No policies: definer functions only.

create index if not exists project_views_project_idx
  on public.project_views (project_id);

-- Record a view — called from the project page render for signed-in
-- non-owners. Idempotent per day.
create or replace function public.record_project_view(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  if exists (
    select 1 from public.projects p
    where p.id = p_project_id and p.owner_id = auth.uid()
  ) then
    return; -- your own visits don't count
  end if;
  insert into public.project_views (project_id, viewer_id)
  values (p_project_id, auth.uid())
  on conflict do nothing;
end;
$$;

revoke all on function public.record_project_view(uuid) from public;
revoke all on function public.record_project_view(uuid) from anon;
grant execute on function public.record_project_view(uuid) to authenticated;

-- View counts for the caller's OWN ideas only.
create or replace function public.idea_view_counts()
returns table (project_id uuid, views int)
language sql
stable
security definer
set search_path = public
as $$
  select v.project_id, count(*)::int
  from public.project_views v
  join public.projects p on p.id = v.project_id
  where p.owner_id = auth.uid()
  group by v.project_id;
$$;

revoke all on function public.idea_view_counts() from public;
revoke all on function public.idea_view_counts() from anon;
grant execute on function public.idea_view_counts() to authenticated;
