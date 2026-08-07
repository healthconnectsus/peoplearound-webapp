-- Peoplearound — 0034 claim guard + helper withdrawal
--
-- Two fixes to the offers/asks board, both found while adding small help:
--
-- 1) HOLE IN 0027. The "neighbor claims offer" policy let any neighbor
--    UPDATE an unclaimed row as long as the new `claimed_by` was themselves.
--    RLS `WITH CHECK` can only inspect the resulting row, not compare it to
--    the old one — so a claimer could rewrite the poster's title, body,
--    photo and pickup spot in the same statement. Nobody would notice until
--    an offer said something its author never wrote.
--
--    RLS cannot express "only these columns may change", so a BEFORE UPDATE
--    trigger does it: if you are not the row's owner, every column except
--    the claim pair is snapped back to its old value. The policies still
--    decide *who* may touch a row; this decides *what* they may touch.
--
-- 2) A helper who claimed something had no way out — the claim policy's
--    USING clause requires `claimed_by is null`, so once claimed, only the
--    poster could act. Somebody who says "I'll help" and then can't must
--    either ghost or message a stranger to be let go. New policy: the
--    claimer may release their own claim, and nothing else (the guard above
--    enforces the "nothing else").
-- Idempotent.

create or replace function public.guard_offer_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Service role and triggers running without a JWT are unaffected.
  if auth.uid() is null or auth.uid() = old.user_id then
    return new;
  end if;

  -- Non-owner: claim/release only.
  new.user_id         := old.user_id;
  new.neighborhood_id := old.neighborhood_id;
  new.kind            := old.kind;
  new.title           := old.title;
  new.description     := old.description;
  new.photo_url       := old.photo_url;
  new.project_id      := old.project_id;
  new.place           := old.place;
  new.lat             := old.lat;
  new.lng             := old.lng;
  new.minutes         := old.minutes;
  new.when_text       := old.when_text;
  new.created_at      := old.created_at;
  return new;
end;
$$;

drop trigger if exists offers_guard_columns on public.offers;
create trigger offers_guard_columns
  before update on public.offers
  for each row execute function public.guard_offer_columns();

-- The helper's way out.
drop policy if exists "claimer releases claim" on public.offers;
create policy "claimer releases claim"
  on public.offers for update to authenticated
  using (claimed_by = auth.uid())
  with check (claimed_by is null or claimed_by = auth.uid());
