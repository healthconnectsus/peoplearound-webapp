-- Peoplearound — 0018 project photos
-- A cover photo per project. Today populated for demo projects from static
-- assets in /public/photos; later this points at Supabase Storage uploads
-- from the share-an-idea wizard. Idempotent.

alter table public.projects
  add column if not exists photo_url text check (photo_url is null or char_length(photo_url) <= 500);
