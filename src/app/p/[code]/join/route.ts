import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { publicProject } from "@/lib/flyer";

/**
 * GET /p/<code>/join — "Count me in" on a project's public page.
 *
 * Someone who scanned a flyer and is already signed in goes straight to the
 * project, where asking to join is one button. Someone who is not goes to
 * sign-up with the project as the place to come back to — the login page
 * shows its form to everyone, so linking there directly would have asked a
 * signed-in neighbor for a password they had already given.
 *
 * Only ever redirects, and changes nothing, so a GET is the right shape:
 * a prefetch or a link preview fetching it does no harm.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const project = await publicProject(code);
  if (!project) {
    return NextResponse.redirect(new URL("/", request.url), { status: 307 });
  }

  const inside = `/projects/${project.id}`;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const to = user ? inside : `/login?next=${encodeURIComponent(inside)}`;
  return NextResponse.redirect(new URL(to, request.url), {
    status: 307,
    headers: { "cache-control": "no-store" },
  });
}
