import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { buildCsp, cspHeaderName } from "@/lib/csp";

/**
 * Refreshes the Supabase auth session on every request and enforces route
 * protection. Runs inside `src/proxy.ts` (Next.js 16's renamed middleware).
 *
 * Unauthenticated users are redirected to /login for any non-public route.
 *
 * This is also where the Content Security Policy is minted, because a nonce
 * has to be generated per request and reach the renderer on the request's own
 * headers — Next reads it from there and stamps every script it emits.
 */
export async function updateSession(request: NextRequest) {
  // Unpredictable and single-use. crypto.randomUUID is available in both the
  // edge and node runtimes.
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce, process.env.NODE_ENV === "development");
  const cspHeader = cspHeaderName();

  /**
   * Forward the incoming request with the CSP attached.
   *
   * Rebuilt from `request.headers` at each call rather than snapshotted once:
   * Supabase's setAll writes refreshed auth cookies onto the request before
   * re-creating the response, and those live in the cookie header. A stale
   * snapshot would forward the pre-refresh session and silently sign people
   * out on token rotation.
   */
  const forward = () => {
    const headers = new Headers(request.headers);
    headers.set("x-nonce", nonce);
    headers.set(cspHeader, csp);
    return { headers };
  };

  let supabaseResponse = NextResponse.next({ request: forward() });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request: forward() });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: do not run code between createServerClient and getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // If an auth confirmation lands on the root (e.g. Supabase fell back to the
  // Site URL because emailRedirectTo wasn't allowlisted), forward the code to
  // the confirm handler instead of letting the route guard drop it.
  if (path === "/" && request.nextUrl.searchParams.has("code")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/confirm";
    return NextResponse.redirect(url);
  }

  const isPublicRoute =
    path.startsWith("/login") ||
    path.startsWith("/auth") ||
    // Marketing landing pages (e.g. "start a club") — shareable while logged out.
    path.startsWith("/start") ||
    // Privacy has to be readable by the people deciding whether to join —
    // a privacy page behind a sign-up wall is worth nothing.
    path === "/privacy" ||
    // City pages exist to be handed to partners and press; they publish
    // counts only (migration 0043) and name nobody.
    path.startsWith("/city/") ||
    // Logged-out landing page calls this to register uncovered locations;
    // it validates its own input and only ever touches anon-safe RPCs.
    path === "/api/register-location" ||
    // Vercel Cron hits this with its own bearer token (checked in-route).
    path === "/api/digest" ||
    path === "/api/gardener" ||
    path === "/api/import-city-events" ||
    path === "/api/welcome-neighbors" ||
    path === "/api/crawl-city-events" ||
    // The browser posts CSP violations here before any session exists, and
    // does so for logged-out pages too. It stores nothing and answers 204.
    path === "/api/csp-report" ||
    // The service worker's offline fallback. It is fetched and cached with
    // no session, and a fallback that redirects to /login is not a fallback:
    // the one moment it exists for is the moment the network is gone.
    path === "/offline" ||
    // Local visual galleries; the pages themselves 404 in production.
    (process.env.NODE_ENV !== "production" && path.startsWith("/dev"));

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Personal invite links: /login?via=<user id>. Remember who invited this
  // visitor so sign-up can attribute them (profiles.invited_by).
  const via = request.nextUrl.searchParams.get("via");
  if (
    via &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(via)
  ) {
    supabaseResponse.cookies.set("pa-via", via, {
      path: "/",
      maxAge: 1209600, // two weeks
      sameSite: "lax",
    });
  }

  const clan = request.nextUrl.searchParams.get('clan');
  if (clan && /^[a-f0-9]{32}$/i.test(clan)) {
    supabaseResponse.cookies.set('pa-clan', clan.toLowerCase(), { path:'/', maxAge:1209600, sameSite:'lax', httpOnly:true });
  }

  // The browser needs the policy on the response; the renderer needed it on
  // the request. Same string, both places. (The redirects above return no
  // document, so there is nothing for a policy to govern.)
  supabaseResponse.headers.set(cspHeader, csp);
  supabaseResponse.headers.set(
    "Reporting-Endpoints",
    `csp-endpoint="${request.nextUrl.origin}/api/csp-report"`,
  );

  // IMPORTANT: return supabaseResponse as-is to keep cookies in sync.
  return supabaseResponse;
}
