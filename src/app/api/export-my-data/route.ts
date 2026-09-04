import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Download-my-data (FEATURE_IDEAS Tier 3 §19).
 *
 * The other half of the promise the delete button already makes: if we say
 * the data is yours, you must be able to take it as well as destroy it.
 * Returns one JSON file with every row this account owns.
 *
 * Read entirely through the CALLER'S OWN session — never the service role —
 * so RLS is what decides what comes out. That means the export cannot leak
 * anything the user couldn't already read, and a bug here can't turn into a
 * data breach. The cost is that a table with no read policy for its owner
 * simply comes back empty, which is the safe direction to fail.
 *
 * Deliberately excluded: `project_views` (per migration 0020 nobody can read
 * raw view rows — they're aggregated for owners only, and exporting them
 * would expose who looked at what), and the stock-photo cache, which is
 * app infrastructure rather than anything the user wrote.
 *
 * `events` has no owner column — an event belongs to a project — so it is
 * gathered by project rather than by user id, below.
 */

export const dynamic = "force-dynamic";

/** Tables to export, and the column that ties a row to its owner. */
const OWNED: [table: string, column: string][] = [
  ["profiles", "id"],
  ["projects", "owner_id"],
  ["project_updates", "author_id"],
  ["stars", "user_id"],
  ["memberships", "user_id"],
  ["contributions", "contributor_id"],
  ["attestations", "attester_id"],
  ["rsvps", "user_id"],
  ["offers", "user_id"],
  ["community_members", "user_id"],
  ["notifications", "user_id"],
  ["messages", "sender_id"],
  ["conversation_participants", "user_id"],
  ["push_subscriptions", "user_id"],
];

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const data: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    account: { id: user.id, email: user.email, created_at: user.created_at },
  };

  const notes: string[] = [];
  for (const [table, column] of OWNED) {
    const { data: rows, error } = await supabase
      .from(table)
      .select("*")
      .eq(column, user.id);
    // A missing table or a policy that hides it shouldn't fail the whole
    // export — say so in the file and carry on.
    if (error) {
      notes.push(`${table}: not included (${error.message})`);
      continue;
    }
    data[table] = rows ?? [];
  }
  // Events belong to a project rather than to a person, so they're gathered
  // from the projects this account owns.
  const projectIds = ((data.projects as { id: string }[] | undefined) ?? []).map(
    (p) => p.id,
  );
  if (projectIds.length > 0) {
    const { data: events, error } = await supabase
      .from("events")
      .select("*")
      .in("project_id", projectIds);
    if (error) notes.push(`events: not included (${error.message})`);
    else data.events = events ?? [];
  } else {
    data.events = [];
  }

  if (notes.length) data.notes = notes;

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="peoplearound-${stamp}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
