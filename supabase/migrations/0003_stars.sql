-- Peoplearound — 0003 stars
-- The low-commitment "I'd be glad this existed" signal on a project. Distinct
-- from a membership: a star is interest, joining is commitment. Idempotent.

create table if not exists public.stars (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id) -- one star per neighbor per project
);

alter table public.stars enable row level security;

create index if not exists stars_project_id_idx on public.stars (project_id);

drop policy if exists "stars readable by authenticated" on public.stars;
create policy "stars readable by authenticated"
  on public.stars for select to authenticated using (true);

drop policy if exists "users star as themselves" on public.stars;
create policy "users star as themselves"
  on public.stars for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "users unstar themselves" on public.stars;
create policy "users unstar themselves"
  on public.stars for delete to authenticated using (auth.uid() = user_id);
