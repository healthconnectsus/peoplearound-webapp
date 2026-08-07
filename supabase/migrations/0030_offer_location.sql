-- Peoplearound — 0030 approximate offer locations
-- "The ladder is at 5th & Oak." An offer can carry a rough pickup spot so
-- neighbors can see whether it's actually near them.
--
-- Deliberately APPROXIMATE, not an address: the poster picks a point on a
-- map (a corner, a park, their block — their choice how precise), and the
-- server rounds it to 3 decimal places (~110 m) before storing. There is no
-- way to record a doorstep here, and `place` is free text the poster writes
-- themselves rather than anything geocoded from their profile.
-- Idempotent.

alter table public.offers
  add column if not exists lat double precision
    check (lat is null or (lat between -90 and 90));
alter table public.offers
  add column if not exists lng double precision
    check (lng is null or (lng between -180 and 180));
alter table public.offers
  add column if not exists place text
    check (place is null or char_length(place) <= 120);

-- Belt and braces: round on write, so even a precise client coordinate is
-- blunted before it ever lands in a row.
create or replace function public.blunt_offer_location()
returns trigger language plpgsql as $$
begin
  if new.lat is not null then new.lat := round(new.lat::numeric, 3); end if;
  if new.lng is not null then new.lng := round(new.lng::numeric, 3); end if;
  return new;
end;
$$;

drop trigger if exists offers_blunt_location on public.offers;
create trigger offers_blunt_location
  before insert or update on public.offers
  for each row execute function public.blunt_offer_location();
