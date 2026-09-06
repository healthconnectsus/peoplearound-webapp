-- Peoplearound — 0044 private conversations are actually private
--
-- Two problems, one root cause: conversation membership was writable by the
-- person being added rather than by the conversation.
--
-- 1. SECURITY. The insert policy on conversation_participants allowed
--    `user_id = auth.uid()`, so ANY signed-in account could add ITSELF to
--    ANY conversation it knew the id of, and then read the whole message
--    history through `is_participant`. Verified end to end: a third account
--    joined a two-person conversation and read a message it was never sent.
--    Conversation ids are not guessable, but they travel — in the address
--    bar (`/chats?c=<id>`), in shared links, in browser history, and in the
--    Referer header sent to every third-party the page loads (map tiles,
--    photos). "Hard to guess" is not the same as "private".
--
-- 2. BROKEN. Creating a conversation did not work at all. The app inserts a
--    conversation and reads back its id with RETURNING, but the SELECT
--    policy requires being a participant — which you cannot be until the row
--    exists. Every "message this neighbor" attempt hit the error path.
--
-- The fix for both: membership is written by a security-definer function
-- that owns the whole transaction, and the policy no longer lets anyone
-- enrol themselves. You may add people to a conversation you are already in;
-- you may not add yourself to one you are not.
--
-- Idempotent.

-- ------------------------------------------------------------------
-- 1. Only participants may add participants.
-- ------------------------------------------------------------------
drop policy if exists "add participants" on public.conversation_participants;
create policy "participants add participants"
  on public.conversation_participants for insert to authenticated
  with check (public.is_participant(conversation_id));

-- ------------------------------------------------------------------
-- 2. Starting a conversation, atomically and safely.
--
-- Security definer because the caller cannot see the conversation until
-- they are in it — the chicken-and-egg that broke creation. Everything the
-- caller controls is validated here: you cannot open a conversation as
-- somebody else, or with yourself, or with an account that doesn't exist.
--
-- Reuses an existing 1:1 rather than accumulating duplicates, which is also
-- what stops this being a cheap way to spam somebody's inbox.
-- ------------------------------------------------------------------
create or replace function public.start_conversation(p_other uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_cid uuid;
begin
  if v_me is null then
    raise exception 'not signed in' using errcode = 'P0001';
  end if;
  if p_other is null or p_other = v_me then
    raise exception 'pick someone else to message' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.profiles where id = p_other) then
    raise exception 'no such neighbor' using errcode = 'P0001';
  end if;

  -- An existing one-to-one conversation between exactly these two.
  select cp.conversation_id into v_cid
    from public.conversation_participants cp
    join public.conversation_participants other
      on other.conversation_id = cp.conversation_id
     and other.user_id = p_other
   where cp.user_id = v_me
     and (
       select count(*) from public.conversation_participants x
        where x.conversation_id = cp.conversation_id
     ) = 2
   limit 1;

  if v_cid is not null then
    return v_cid;
  end if;

  -- The rate cap on conversations still applies: the trigger runs on this
  -- insert exactly as it did when the app inserted directly.
  insert into public.conversations default values returning id into v_cid;
  insert into public.conversation_participants (conversation_id, user_id)
  values (v_cid, v_me), (v_cid, p_other);

  return v_cid;
end;
$$;

revoke all on function public.start_conversation(uuid) from public, anon;
grant execute on function public.start_conversation(uuid) to authenticated;
