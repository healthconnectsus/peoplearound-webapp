import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/push/subscribe   — store this device's push endpoint
 * DELETE /api/push/subscribe — forget it
 *
 * Writes go through the *user's* client, not the service role, so RLS
 * ("insert own push subs") is the thing enforcing that nobody registers an
 * endpoint against someone else's account.
 */

type Body = {
  endpoint?: unknown;
  keys?: { p256dh?: unknown; auth?: unknown };
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
  const p256dh = typeof body.keys?.p256dh === "string" ? body.keys.p256dh : "";
  const auth = typeof body.keys?.auth === "string" ? body.keys.auth : "";
  if (!endpoint || !p256dh || !auth || endpoint.length > 800) {
    return NextResponse.json({ error: "bad subscription" }, { status: 400 });
  }
  // Push endpoints are always https URLs at the browser vendor's own service.
  if (!endpoint.startsWith("https://")) {
    return NextResponse.json({ error: "bad endpoint" }, { status: 400 });
  }

  // endpoint is unique: re-subscribing on the same device (or after the user
  // switches accounts on a shared phone) rebinds rather than duplicating.
  const { error } = await supabase.from("push_subscriptions").upsert(
    { user_id: user.id, endpoint, p256dh, auth, failed_at: null },
    { onConflict: "endpoint" },
  );
  if (error) {
    return NextResponse.json({ error: "save failed" }, { status: 500 });
  }

  await supabase
    .from("profiles")
    .update({ push_opt_out: false })
    .eq("id", user.id);

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });

  let endpoint = "";
  try {
    const body = (await request.json()) as Body;
    endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
  } catch {
    // no body — drop every endpoint for this user
  }

  const q = supabase.from("push_subscriptions").delete().eq("user_id", user.id);
  await (endpoint ? q.eq("endpoint", endpoint) : q);

  await supabase
    .from("profiles")
    .update({ push_opt_out: true })
    .eq("id", user.id);

  return NextResponse.json({ ok: true });
}
