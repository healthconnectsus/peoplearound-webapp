import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Who is asking, fetched once per request no matter how often it is asked.
 *
 * `supabase.auth.getUser()` is not a cookie read — it calls the auth server to
 * verify the token, which costs a network round trip of about 130ms. Four
 * separate places wanted the user while rendering a single page: the page
 * itself, the app shell, the top bar and the map shell. Each asked
 * independently, so every page load spent roughly half a second asking the
 * same question four times and getting the same answer.
 *
 * React's `cache` is exactly the tool for this — it memoises for the lifetime
 * of one server render and nothing longer, so two different visitors never
 * share a result, and the verification still happens on every request. It just
 * happens once.
 *
 * The proxy's own check stays separate and unavoidable: middleware runs before
 * the render, in its own context, and it is what refreshes the session cookie.
 */
export const currentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
