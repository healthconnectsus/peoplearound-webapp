-- Peoplearound — 0026 admin accounts
-- Migration 0025 seeded admin from the GitHub/Vercel account address, which
-- isn't the address used to sign in to the app. Grant `is_admin` to the
-- operator's real login too, and keep both so either account can reach
-- /admin. Idempotent — re-running is safe, and adding a future admin means
-- appending one address here.

update public.profiles
   set is_admin = true
 where id in (
   select id from auth.users
   where lower(email) in (
     'peoplearound.alexandre@gmail.com',
     'healthconnectsus@gmail.com'
   )
 );
