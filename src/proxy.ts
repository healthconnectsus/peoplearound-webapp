import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next.js 16 renamed the `middleware` convention to `proxy`. This runs on the
 * server before routes render — we use it to refresh the Supabase session and
 * guard protected routes.
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, and common image assets
     * - the four files that must answer to a stranger.
     *
     * That last group was a real bug, not a tidy-up. Anything reaching the
     * proxy without a session is redirected to /login, and these are all
     * fetched with no session by something that cannot follow a redirect to
     * an HTML page:
     *
     *   sw.js               the browser refuses a service worker that
     *                       redirects ("The script resource is behind a
     *                       redirect, which is disallowed"), so registration
     *                       failed outright for every logged-out visitor.
     *   manifest.webmanifest  a manifest that answers with the login page is
     *                       not a manifest, so "install this app" never
     *                       appeared on the one page a new visitor sees.
     *   robots.txt          crawlers were served a redirect instead of the
     *                       rules, on a site that deliberately publishes
     *                       city pages for partners and press.
     *   sitemap.xml         same.
     */
    "/((?!_next/static|_next/image|favicon\\.ico|sw\\.js|manifest\\.webmanifest|robots\\.txt|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
