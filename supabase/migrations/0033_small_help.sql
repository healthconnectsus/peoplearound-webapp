-- Peoplearound — 0033 small help ("a hand for 20 minutes")
--
-- Not every need is an idea. "Help me move a sofa into the living room" has
-- no team, no history, no arc — it's twenty minutes and a second pair of
-- hands. Forcing that through the project wizard would be absurd, and the
-- person who needs it would simply not ask.
--
-- So it becomes a fourth kind on `offers` rather than a new table: the board
-- already models "a neighbor posts something, another neighbor claims it,
-- the two sort it out like people." An ask is the mirror image of an offer,
-- and inherits — for free and correctly — the neighborhood RLS, the rate
-- cap, the claim policy, the claim notification, and the ~110 m location
-- blunting. Adding a parallel table would have duplicated all five.
--
-- New columns:
--   minutes   — the honest estimate that makes an ask answerable. "20 min"
--               is a decision someone can make on the spot; "help me move"
--               is a commitment they have to think about.
--   when_text — free text ("Saturday morning"), not a datetime. Small help
--               is arranged between two people, not scheduled by software.
-- Idempotent.
--
-- NOTE: this migration deliberately never writes the literal 'need' as an
-- enum value — Postgres forbids *using* a value added by ALTER TYPE in the
-- same transaction, and the Management API runs this file as one.

alter type public.offer_kind add value if not exists 'need';

alter table public.offers
  add column if not exists minutes int
    check (minutes is null or minutes between 5 and 480);

alter table public.offers
  add column if not exists when_text text
    check (when_text is null or char_length(when_text) <= 80);

-- The claim notification is the only place wording matters: claiming an
-- offer takes something, claiming an ask gives something. Same row, opposite
-- human meaning, so the poster should hear the right sentence.
create or replace function public.notif_offer_claim()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_name text;
  v_kind text;
begin
  if new.claimed_by is not null and old.claimed_by is null then
    select coalesce(display_name, 'A neighbor') into v_name
      from public.profiles where id = new.claimed_by;
    v_kind := new.kind::text;
    if v_kind = 'need' then
      perform public.notify(new.user_id, 'contribution',
        '🙌 ' || v_name || ' is coming to help with “' || new.title || '”',
        '/asks');
    else
      perform public.notify(new.user_id, 'contribution',
        v_name || ' claimed your offer “' || new.title || '”', '/offers');
    end if;
  end if;
  return null;
end;
$$;

-- Asks are answered in hours, not weeks: the board sorts by newest and an
-- unanswered ask should be easy to find. Partial index over open rows only.
create index if not exists offers_open_idx
  on public.offers (neighborhood_id, created_at desc)
  where claimed_by is null;
