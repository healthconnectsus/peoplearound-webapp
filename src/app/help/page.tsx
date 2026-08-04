import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";

const FAQ: { q: string; a: string }[] = [
  {
    q: "What is Peoplearound?",
    a: "A hyperlocal network where neighbors share ideas and build them together. A project is a living page — like a repository for real life — with a team, a history, and credit for everyone who helps.",
  },
  {
    q: "What does starring do?",
    a: "A star means “I'd be glad this existed.” It costs nothing, but it tells the founder the desire is real — and it ranks the neighborhood's Local Faves.",
  },
  {
    q: "How do I join a project?",
    a: "Open the project and tap “Ask to join.” The founder welcomes you onto the team. Joining is founder-approved so teams stay real; leaving is always allowed and never penalized.",
  },
  {
    q: "What counts as a contribution?",
    a: "Anything that moves the project forward: knowledge, time, tools, a truck on Saturday. Contributions are confirmed by the team and credited to you permanently.",
  },
  {
    q: "What are events?",
    a: "The physical side of a project — a planting day, a fix-up morning. RSVP so the team knows who's coming.",
  },
  {
    q: "Why do I have to pick a neighborhood?",
    a: "Everything on Peoplearound is local. Your neighborhood decides which projects, events, and people you see. Your precise location is used once to find it and never stored.",
  },
];

export default async function HelpPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <AppShell>
      <main className="w-full max-w-2xl flex-1 p-4 lg:py-6">
        <h1 className="text-2xl font-semibold tracking-tight">Help Center</h1>
        <p className="mt-1 text-sm text-black/50 dark:text-white/50">
          Build ideas with your communities. Here is how it all works.
        </p>

        <ul className="mt-6 flex flex-col gap-3">
          {FAQ.map((item) => (
            <li
              key={item.q}
              className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-zinc-900"
            >
              <h2 className="font-medium">{item.q}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-black/60 dark:text-white/60">
                {item.a}
              </p>
            </li>
          ))}
        </ul>

        <p className="mt-8 text-center text-sm text-black/50 dark:text-white/50">
          Still stuck?{" "}
          <a
            href="mailto:healthconnectsus@gmail.com"
            className="underline hover:text-black/70 dark:hover:text-white/70"
          >
            Email us
          </a>{" "}
          or{" "}
          <Link href="/projects/new" className="underline">
            just start building
          </Link>
          .
        </p>
      </main>
    </AppShell>
  );
}
