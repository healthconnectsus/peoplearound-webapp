-- Peoplearound — 0029 AI Gardener nudges
-- The agent's second job (PRD §3.9): when a project stalls, nudge the
-- founder PRIVATELY with one small concrete next step — coach, not judge.
-- If it never takes off, offer a dignified off-ramp (a smaller version, or a
-- nearby project to join). The word "failed" appears nowhere.
--
-- Storage is one row per project so a founder is nudged at most once per
-- stage, and only they can ever read it.
-- Idempotent.

create table if not exists public.project_nudges (
  project_id uuid primary key references public.projects (id) on delete cascade,
  kind text not null check (kind in ('stall', 'offramp')),
  body text not null check (char_length(body) <= 600),
  dismissed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.project_nudges enable row level security;

-- Read/dismiss: the founder only. Nudges are never public — a nudge is a
-- private word from a coach, not a public mark on a quiet project.
drop policy if exists "founder reads own nudges" on public.project_nudges;
create policy "founder reads own nudges"
  on public.project_nudges for select to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists "founder dismisses nudge" on public.project_nudges;
create policy "founder dismisses nudge"
  on public.project_nudges for update to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  )
  with check (true);

-- No client inserts: the cron writes with the service role.

-- Candidates for a nudge: quiet projects whose founder hasn't been nudged
-- yet. "Quiet" = no confirmed help, no upcoming event, and either few stars
-- or no team after a week (stall) / three weeks (off-ramp).
create or replace function public.nudge_candidates(p_limit int default 20)
returns table (
  project_id uuid,
  title text,
  description text,
  category text,
  state text,
  age_days int,
  stars int,
  team int,
  kind text
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.title, p.description, p.category, p.state::text,
         extract(day from now() - p.created_at)::int as age_days,
         (select count(*)::int from public.stars s where s.project_id = p.id),
         (select count(*)::int from public.memberships m
           where m.project_id = p.id and m.status = 'accepted'),
         case when now() - p.created_at > interval '21 days' then 'offramp'
              else 'stall' end
    from public.projects p
   where p.state in ('idea', 'active')
     and p.created_at < now() - interval '7 days'
     and not exists (select 1 from public.project_nudges n where n.project_id = p.id)
     and not exists (
       select 1 from public.contributions c
        where c.project_id = p.id and c.status = 'confirmed'
     )
     and not exists (
       select 1 from public.events e
        where e.project_id = p.id and e.starts_at > now()
     )
     and (select count(*) from public.memberships m
           where m.project_id = p.id and m.status = 'accepted') = 0
   order by p.created_at
   limit p_limit;
$$;

revoke all on function public.nudge_candidates(int) from public;
revoke all on function public.nudge_candidates(int) from anon;
revoke all on function public.nudge_candidates(int) from authenticated;
grant execute on function public.nudge_candidates(int) to service_role;
