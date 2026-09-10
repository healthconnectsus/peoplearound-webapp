-- Peoplearound — 0050 you cannot make yourself an admin
--
-- CRITICAL, and live since 0025 added the column.
--
-- `profiles` has a row-scoped update policy (0001):
--
--   create policy "users update own profile" on public.profiles
--     for update to authenticated
--     using (auth.uid() = id) with check (auth.uid() = id);
--
-- Row-scoped, but never COLUMN-scoped — and no migration ever narrowed
-- Supabase's default `grant all on public.profiles to authenticated`. So the
-- policy faithfully enforced "you may edit your own row" while saying nothing
-- about WHICH fields, and `is_admin` (added in 0025) sat in that row.
--
-- The whole attack was one line in the browser console, using the anon key
-- that ships to every visitor:
--
--   supabase.from('profiles').update({ is_admin: true }).eq('id', myId)
--
-- Verified end to end: an ordinary account promoted itself and the write was
-- accepted. What that buys is the entire operator console, because both admin
-- gates read exactly this column — `requireAdministrator()` in lib/admin.ts
-- and `requireAdmin()` in admin/adminActions.ts — and hand back a
-- service-role client that bypasses all RLS. That is: invite anyone by email
-- from our auth domain, read every neighbor's activity, delete any project or
-- community, and spend the paid Ticketmaster/SerpApi quota at will. Migration
-- 0040 makes it worse by exempting `is_admin` from every rate cap and from
-- the paid AI credit cap, so the same line also buys uncapped API spend.
--
-- The app-layer check was never the problem and could never have fixed it: no
-- amount of server-side verification helps when the client can write the flag
-- the server verifies. The fix has to be that the column is not writable.
--
-- Column-level grants rather than a trigger: a grant is declarative, shows up
-- in `information_schema.column_privileges`, and fails closed for any column
-- added later — a new sensitive column is unwritable until someone
-- deliberately grants it. A trigger pinning `new.is_admin := old.is_admin`
-- would protect only the column somebody remembered to name.
--
-- Idempotent.

-- ------------------------------------------------------------------
-- 1. Take away the blanket UPDATE.
-- ------------------------------------------------------------------
revoke update on public.profiles from authenticated;
revoke update on public.profiles from anon;

-- ------------------------------------------------------------------
-- 2. Give back exactly the columns a person edits about themselves.
--
-- Every one of these has a real write path in the app:
--   display_name, bio, gender, pronouns, show_pronouns, website, hometown
--                                     — /settings (settings/actions.ts)
--   avatar_url, cover_url             — /settings photo upload (PhotoUploads)
--   neighborhood_id                   — joining a community
--                                       (neighborhood/actions.ts, page.tsx)
--   digest_opt_out                    — notificationActions.ts
--   push_opt_out                      — /api/push/subscribe
--   invited_by                        — attributed once on first visit
--                                       (page.tsx; profiles_no_self_invite
--                                       still blocks naming yourself)
--
-- Deliberately absent, and now unwritable from a session:
--   is_admin    — operator only, set with the service role
--   id          — identity, assigned at signup
--   created_at  — history is not editable
-- ------------------------------------------------------------------
grant update (
  display_name,
  bio,
  gender,
  pronouns,
  show_pronouns,
  website,
  hometown,
  avatar_url,
  cover_url,
  neighborhood_id,
  digest_opt_out,
  push_opt_out,
  invited_by
) on public.profiles to authenticated;

-- ------------------------------------------------------------------
-- 3. Nothing in a user session inserts a profile — rows are created at
--    signup — so authenticated needs no INSERT here. Revoking it closes the
--    variant of the same trick where somebody without a row creates one with
--    the flag already set.
-- ------------------------------------------------------------------
revoke insert on public.profiles from authenticated;
revoke insert on public.profiles from anon;

-- The service role is unaffected and remains the only way to grant admin.
