import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth session on every request and enforces route
 * protection. Runs inside `src/proxy.ts` (Next.js 16's renamed middleware).
 *
 * Unauthenticated users are redirected to /login for any non-public route.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

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
          supabaseResponse = NextResponse.next({ request });
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
    // Logged-out landing page calls this to register uncovered locations;
    // it validates its own input and only ever touches anon-safe RPCs.
    path === "/api/register-location";

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

  // IMPORTANT: return supabaseResponse as-is to keep cookies in sync.
  return supabaseResponse;
}
