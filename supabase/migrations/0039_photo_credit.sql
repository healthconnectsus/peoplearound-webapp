-- Peoplearound — 0039 the photographer's name travels with the photo
--
-- The Unsplash API guidelines require crediting the photographer wherever a
-- photo is DISPLAYED, not just where it was picked. The wizard showed the
-- credit at selection time and then dropped it — the project page displayed
-- the photo bare. These two columns let the credit travel with the photo.
-- Null for uploaded photos (your own picture needs no credit line).
-- Idempotent.

alter table public.projects
  add column if not exists photo_credit_name text
    check (photo_credit_name is null or char_length(photo_credit_name) <= 120);

alter table public.projects
  add column if not exists photo_credit_url text
    check (photo_credit_url is null or char_length(photo_credit_url) <= 500);
