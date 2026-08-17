-- Peoplearound — 0041 repair NULL auth token columns
--
-- Symptom: every sign-in fails with "Database error querying schema", and
-- the admin listUsers API fails with "Database error finding users". Not one
-- account — all of them, including accounts that have nothing wrong.
--
-- Cause: GoTrue reads auth.users into Go structs whose token fields are
-- plain strings, not pointers. A NULL in confirmation_token (or any of its
-- siblings) is unreadable, and the scan error surfaces as a schema error, so
-- the message points nowhere near the actual problem. Rows created through
-- signup always carry '' in those columns; rows INSERTed directly by a seed
-- script leave them NULL. The demo seed (scripts/demo-seed*.sql) did exactly
-- that for 100 accounts, and one bad row is enough to break the query for
-- everyone.
--
-- Fix: NULL → ''. The seed scripts now write '' explicitly, so re-seeding
-- can't reintroduce it; this migration repairs what's already there.
-- Idempotent — running it again updates nothing.

update auth.users
   set confirmation_token         = coalesce(confirmation_token, ''),
       recovery_token             = coalesce(recovery_token, ''),
       email_change               = coalesce(email_change, ''),
       email_change_token_new     = coalesce(email_change_token_new, ''),
       email_change_token_current = coalesce(email_change_token_current, ''),
       reauthentication_token     = coalesce(reauthentication_token, ''),
       phone_change               = coalesce(phone_change, ''),
       phone_change_token         = coalesce(phone_change_token, '')
 where confirmation_token is null
    or recovery_token is null
    or email_change is null
    or email_change_token_new is null
    or email_change_token_current is null
    or reauthentication_token is null
    or phone_change is null
    or phone_change_token is null;
