import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * The stranger's view of the database, from the server.
 *
 * The public pages — `/city`, `/city/<slug>`, the sitemap, the front door's
 * live tally — show only what an anonymous visitor may see, through views
 * that were built to be anon-safe (migrations 0012, 0043, 0058). They were
 * reading those views through the cookie-bound server client anyway, and
 * that had a cost that had nothing to do with the data: touching `cookies()`
 * makes a page dynamic, so a page whose every visitor gets the same answer
 * was rendered on a function, with a database read, for each of them —
 * including every crawler.
 *
 * This client reads no cookies and holds no session, so a page that uses it
 * can be prerendered and served from the CDN, and revalidated on a timer.
 * It sees exactly what `anon` sees, which for these pages is the point.
 *
 * Not for anything signed in. A page that renders a person's own data needs
 * their session, and that is `createClient()` in `./server`.
 */
export function createAnonClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
