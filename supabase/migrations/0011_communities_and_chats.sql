-- Peoplearound — 0011 communities and chats
-- 1) Generalizes neighborhoods into "communities" (kind: neighborhood,
--    cultural, hobby, identity, geographic, interest, other) and lets a
--    user belong to MANY of them via community_members. The profile's
--    neighborhood_id remains the user's PRIMARY community.
-- 2) Adds direct messaging: conversations, participants, messages.
-- Idempotent so it is safe to re-run.

-- ============================================================
-- communities (the neighborhoods table, generalized)
-- ============================================================
alter table public.neighborhoods
  add column if not exists kind text not null default 'neighborhood',
  add column if not exists description text;

alter table public.neighborhoods drop constraint if exists neighborhoods_kind_check;
alter table public.neighborhoods add constraint neighborhoods_kind_check
  check (kind in ('neighborhood','cultural','hobby','identity','geographic','interest','other'));

drop policy if exists "authenticated can create communities" on public.neighborhoods;
create policy "authenticated can create communities"
  on public.neighborhoods for insert to authenticated with check (true);

-- ============================================================
-- community_members: a user can belong to many communities
-- ============================================================
create table if not exists public.community_members (
  community_id uuid not null references public.neighborhoods (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (community_id, user_id)
);

alter table public.community_members enable row level security;

drop policy if exists "community members readable" on public.community_members;
create policy "community members readable"
  on public.community_members for select to authenticated using (true);

drop policy if exists "join communities" on public.community_members;
create policy "join communities"
  on public.community_members for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "leave communities" on public.community_members;
create policy "leave communities"
  on public.community_members for delete to authenticated
  using (auth.uid() = user_id);

-- Backfill: everyone is a member of their current primary neighborhood.
insert into public.community_members (community_id, user_id)
select neighborhood_id, id from public.profiles
where neighborhood_id is not null
on conflict do nothing;

-- ============================================================
-- messaging
-- ============================================================
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_idx
  on public.messages (conversation_id, created_at);

alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

-- Helper: is the current user in this conversation? (security definer so
-- policies can consult participants without recursive RLS.)
create or replace function public.is_participant(cid uuid)
returns boolean
language sql security definer set search_path = public stable
as $$
  select exists (
    select 1 from conversation_participants
    where conversation_id = cid and user_id = auth.uid()
  );
$$;

drop policy if exists "participants read conversations" on public.conversations;
create policy "participants read conversations"
  on public.conversations for select to authenticated
  using (public.is_participant(id));

drop policy if exists "authenticated create conversations" on public.conversations;
create policy "authenticated create conversations"
  on public.conversations for insert to authenticated with check (true);

drop policy if exists "read participants" on public.conversation_participants;
create policy "read participants"
  on public.conversation_participants for select to authenticated
  using (user_id = auth.uid() or public.is_participant(conversation_id));

-- Insert order matters when starting a chat: add yourself first, then the
-- other person (allowed because by then you are a participant).
drop policy if exists "add participants" on public.conversation_participants;
create policy "add participants"
  on public.conversation_participants for insert to authenticated
  with check (user_id = auth.uid() or public.is_participant(conversation_id));

drop policy if exists "update own participant row" on public.conversation_participants;
create policy "update own participant row"
  on public.conversation_participants for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "participants read messages" on public.messages;
create policy "participants read messages"
  on public.messages for select to authenticated
  using (public.is_participant(conversation_id));

drop policy if exists "participants send messages" on public.messages;
create policy "participants send messages"
  on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and public.is_participant(conversation_id));

-- Realtime for live chat (LiveRefresh subscribes to messages).
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
