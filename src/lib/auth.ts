import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { verifiedClaims } from "@/lib/supabase/claims";

/** The signed-in person, as much of them as a page needs before it reads their profile. */
export type CurrentUser = { id: string; email?: string };

/**
 * Who is asking, established once per request no matter how often it is asked.
 *
 * Two savings stacked here. The identity comes from verifying the session's
 * own token against the project's published signing key (see
 * `supabase/claims.ts`) rather than asking the auth server, which turns a
 * 130ms network round trip into a local signature check. And React's `cache`
 * memoises the answer for the lifetime of one server render — the page, the
 * app shell, the top bar and the map shell all want the user, and used to
 * ask separately. Nothing longer than a render: two visitors never share a
 * result.
 *
 * Server actions and route handlers keep calling `auth.getUser()` directly.
 * They run once, on a write, and the freshest possible answer is worth the
 * trip there; on a read that is repeated for every page it was not.
 */
export const currentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const claims = await verifiedClaims(supabase);
  if (!claims) return null;
  return { id: claims.sub, email: claims.email };
});
