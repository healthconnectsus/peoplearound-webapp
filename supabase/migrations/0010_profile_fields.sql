-- Peoplearound — 0010 profile fields and photos
-- Richer identity for the Edit Profile page (bio, pronouns, hometown, …)
-- plus a public storage bucket for avatar and cover photos.
-- Idempotent so it is safe to re-run.

-- ============================================================
-- profiles: identity fields
-- ============================================================
alter table public.profiles
  add column if not exists bio text check (char_length(bio) <= 500),
  add column if not exists gender text,
  add column if not exists pronouns text,
  add column if not exists show_pronouns boolean not null default false,
  add column if not exists website text check (char_length(website) <= 200),
  add column if not exists hometown text check (char_length(hometown) <= 40),
  add column if not exists avatar_url text,
  add column if not exists cover_url text;

-- ============================================================
-- storage: public "profiles" bucket, own-folder writes
-- Paths are "<user_id>/avatar.jpg" etc., so the first folder
-- segment must match the uploader's auth.uid().
-- ============================================================
insert into storage.buckets (id, name, public)
values ('profiles', 'profiles', true)
on conflict (id) do nothing;

drop policy if exists "profile images public read" on storage.objects;
create policy "profile images public read"
  on storage.objects for select
  using (bucket_id = 'profiles');

drop policy if exists "users upload own profile images" on storage.objects;
create policy "users upload own profile images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'profiles'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users update own profile images" on storage.objects;
create policy "users update own profile images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'profiles'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users delete own profile images" on storage.objects;
create policy "users delete own profile images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'profiles'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
