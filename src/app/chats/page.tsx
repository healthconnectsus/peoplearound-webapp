import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageCircle, SquarePen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import { LiveRefresh } from "@/components/LiveRefresh";
import { initials, timeAgo } from "@/lib/projects";
import { Composer } from "./Composer";
import { MarkRead } from "./MarkRead";

type PersonLite = {
  id: string;
  display_name: string | null;
  avatar_url?: string | null;
};

function Avatar({ person, size }: { person: PersonLite; size: string }) {
  const name = person.display_name ?? "A neighbor";
  if (person.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage URL
      <img
        src={person.avatar_url}
        alt=""
        className={`${size} shrink-0 rounded-full object-cover`}
      />
    );
  }
  return (
    <span
      className={`${size} flex shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200`}
    >
      {initials(name)}
    </span>
  );
}

export default async function ChatsPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; to?: string; new?: string; error?: string }>;
}) {
  const { c: selectedId, to, new: composeNew, error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // My conversations (pre-migration-0011 this errors → show setup notice).
  const { data: myRows, error: migrationError } = await supabase
    .from("conversation_participants")
    .select("conversation_id,last_read_at")
    .eq("user_id", user.id);
  const migrationApplied = !migrationError;
  const convIds = (myRows ?? []).map((r) => r.conversation_id);
  const lastReadOf = new Map(
    (myRows ?? []).map((r) => [r.conversation_id, r.last_read_at as string]),
  );

  // Partners in those conversations.
  const partnerOf = new Map<string, PersonLite>();
  if (convIds.length > 0) {
    const { data: partRows } = await supabase
      .from("conversation_participants")
      .select("conversation_id,user_id")
      .in("conversation_id", convIds)
      .neq("user_id", user.id);
    const partnerIds = [...new Set((partRows ?? []).map((r) => r.user_id))];
    const { data: profRows } = partnerIds.length
      ? await supabase.from("profiles").select("*").in("id", partnerIds)
      : { data: [] };
    const profOf = new Map(
      ((profRows ?? []) as PersonLite[]).map((p) => [p.id, p]),
    );
    for (const r of partRows ?? []) {
      if (!partnerOf.has(r.conversation_id)) {
        partnerOf.set(
          r.conversation_id,
          profOf.get(r.user_id) ?? { id: r.user_id, display_name: null },
        );
      }
    }
  }

  // Recent messages → last-message preview per conversation + unread flags.
  type Msg = {
    id: string;
    conversation_id: string;
    sender_id: string;
    body: string;
    created_at: string;
  };
  let recent: Msg[] = [];
  if (convIds.length > 0) {
    const { data } = await supabase
      .from("messages")
      .select("id,conversation_id,sender_id,body,created_at")
      .in("conversation_id", convIds)
      .order("created_at", { ascending: false })
      .limit(400);
    recent = (data ?? []) as Msg[];
  }
  const lastMsgOf = new Map<string, Msg>();
  for (const m of recent) {
    if (!lastMsgOf.has(m.conversation_id)) lastMsgOf.set(m.conversation_id, m);
  }
  const list = convIds
    .map((id) => ({
      id,
      partner: partnerOf.get(id),
      last: lastMsgOf.get(id),
      unread: (() => {
        const last = lastMsgOf.get(id);
        const read = lastReadOf.get(id);
        return Boolean(
          last && last.sender_id !== user.id && read && last.created_at > read,
        );
      })(),
    }))
    .filter((x) => x.partner)
    .sort((a, b) =>
      (b.last?.created_at ?? "").localeCompare(a.last?.created_at ?? ""),
    );

  // Selected thread.
  let thread: Msg[] = [];
  let threadPartner: PersonLite | null = null;
  if (selectedId && convIds.includes(selectedId)) {
    const { data } = await supabase
      .from("messages")
      .select("id,conversation_id,sender_id,body,created_at")
      .eq("conversation_id", selectedId)
      .order("created_at", { ascending: true })
      .limit(500);
    thread = (data ?? []) as Msg[];
    threadPartner = partnerOf.get(selectedId) ?? null;
  }

  // New-message flow: ?to=<user> composes to that person.
  let toPerson: PersonLite | null = null;
  if (to && to !== user.id) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", to)
      .maybeSingle();
    toPerson = (data as PersonLite | null) ?? null;
  }

  // People picker for ?new=1.
  let people: PersonLite[] = [];
  if (composeNew) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .neq("id", user.id)
      .order("display_name")
      .limit(100);
    people = (data ?? []) as PersonLite[];
  }

  const showThread = Boolean(threadPartner || toPerson);

  return (
    <AppShell>
      <LiveRefresh
        tables={
          selectedId
            ? `messages:conversation_id=eq.${selectedId}`
            : "messages"
        }
      />
      <main className="w-full max-w-5xl flex-1 p-4 lg:py-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-3xl font-extrabold tracking-tight">Chats</h1>
          <Link
            href="/chats?new=1"
            className="flex items-center gap-2 rounded-full bg-black/5 px-4 py-2 text-sm font-medium transition-colors hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15"
          >
            <SquarePen className="h-4 w-4" aria-hidden />
            New message
          </Link>
        </div>

        {error ? (
          <p className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        ) : null}
        {!migrationApplied ? (
          <p className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
            Messaging needs migration 0011 — run
            supabase/migrations/0011_communities_and_chats.sql in the Supabase
            SQL editor.
          </p>
        ) : null}

        <div className="grid min-h-[32rem] overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm dark:border-slate-600 dark:bg-zinc-900 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          {/* Conversation list */}
          <div
            className={`border-slate-300 dark:border-slate-500 lg:border-r ${showThread || composeNew ? "hidden lg:block" : ""}`}
          >
            {list.length === 0 ? (
              <p className="p-6 text-sm text-black/50 dark:text-white/50">
                No conversations yet.
              </p>
            ) : (
              <ul className="flex flex-col">
                {list.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/chats?c=${c.id}`}
                      className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-black/5 dark:hover:bg-white/10 ${
                        c.id === selectedId ? "bg-black/5 dark:bg-white/10" : ""
                      }`}
                    >
                      <Avatar person={c.partner!} size="h-10 w-10" />
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block truncate text-sm ${c.unread ? "font-semibold" : "font-medium"}`}
                        >
                          {c.partner!.display_name ?? "A neighbor"}
                        </span>
                        {c.last ? (
                          <span
                            className={`block truncate text-xs ${
                              c.unread
                                ? "font-medium text-black/80 dark:text-white/80"
                                : "text-black/50 dark:text-white/50"
                            }`}
                          >
                            {c.last.sender_id === user.id ? "You: " : ""}
                            {c.last.body} · {timeAgo(c.last.created_at)}
                          </span>
                        ) : null}
                      </span>
                      {c.unread ? (
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-pa-brand" />
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Right pane */}
          <div className="flex min-h-[24rem] flex-col">
            {composeNew ? (
              <div className="flex-1 overflow-y-auto p-4">
                <p className="mb-3 text-sm font-medium">
                  Who do you want to message?
                </p>
                <ul className="flex flex-col gap-1">
                  {people.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/chats?to=${p.id}`}
                        className="flex items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                      >
                        <Avatar person={p} size="h-9 w-9" />
                        <span className="text-sm font-medium">
                          {p.display_name ?? "A neighbor"}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : threadPartner && selectedId ? (
              <>
                <MarkRead conversationId={selectedId} />
                <div className="flex items-center gap-3 border-b border-slate-300 px-4 py-3 dark:border-slate-500">
                  <Avatar person={threadPartner} size="h-9 w-9" />
                  <p className="font-medium">
                    {threadPartner.display_name ?? "A neighbor"}
                  </p>
                </div>
                <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
                  {thread.map((m) => (
                    <div
                      key={m.id}
                      className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                        m.sender_id === user.id
                          ? "self-end rounded-br-md bg-pa-brand text-pa-brand-ink"
                          : "self-start rounded-bl-md bg-stone-100 dark:bg-zinc-800"
                      }`}
                    >
                      {m.body}
                      <span
                        className={`mt-0.5 block text-right text-[10px] ${
                          m.sender_id === user.id
                            ? "text-white/70"
                            : "text-black/40 dark:text-white/40"
                        }`}
                      >
                        {timeAgo(m.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
                <Composer conversationId={selectedId} />
              </>
            ) : toPerson ? (
              <>
                <div className="flex items-center gap-3 border-b border-slate-300 px-4 py-3 dark:border-slate-500">
                  <Avatar person={toPerson} size="h-9 w-9" />
                  <p className="font-medium">
                    {toPerson.display_name ?? "A neighbor"}
                  </p>
                </div>
                <div className="flex flex-1 items-center justify-center p-6 text-sm text-black/50 dark:text-white/50">
                  Say hello — this starts your conversation.
                </div>
                <Composer toUserId={toPerson.id} />
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
                <MessageCircle
                  className="h-14 w-14 text-black/20 dark:text-white/20"
                  strokeWidth={1.25}
                  aria-hidden
                />
                <p className="font-medium">Chat with neighbors</p>
                <p className="max-w-xs text-sm text-black/50 dark:text-white/50">
                  Message the people you&apos;re building with — teammates,
                  founders, and neighbors.
                </p>
                <Link
                  href="/chats?new=1"
                  className="mt-1 rounded-full bg-black/5 px-5 py-2 text-sm font-medium transition-colors hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15"
                >
                  Send a message
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </AppShell>
  );
}
