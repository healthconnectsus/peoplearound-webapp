import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { ContentSkeleton } from "@/components/ContentSkeleton";

export const metadata = { title: "Help Center" };

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
    q: "I just need a hand with something — do I have to start a project?",
    a: "No. Post it under Small help instead: what you need and roughly how long it'll take (“Move a sofa into the living room · 20 min”). A neighbor taps “I'll help” and the two of you sort out the rest. Asking is not a favor you owe back.",
  },
  {
    q: "What are events?",
    a: "The physical side of a project — a planting day, a fix-up morning. RSVP so the team knows who's coming. Every event has its own page: the details, who's coming, and what still needs doing.",
  },
  {
    q: "How do I get people to come?",
    a: "Open your event and tap “Publish & get a QR code.” You get a page anyone can read without an account, a QR code and a one-page poster to print, and buttons to send it to WhatsApp, a text message or email. Pasted into a group chat, the link unfurls with the name, time and place. Someone who scans the poster and taps “I'm in” is brought back to your event once they've joined.",
  },
  {
    q: "Can I ask for help running an event?",
    a: "List the jobs: a name, how many people it takes, and a line about what it involves (“Setup crew · 2 · arrive at 9, carry tables out”). Any neighbor can take one, which also says they're coming, and a job can't be oversubscribed. Jobs still needing someone show on the events list and on your published page, so a passer-by can see exactly what's missing.",
  },
  {
    q: "What happens on the day?",
    a: "Everyone coming gets a reminder the day before. If something changes — it's muddy, bring boots — send a note from the event page and it reaches everyone coming, including the people who found you through a poster. Print the run sheet for the clipboard, or tick people off in the app. Who turned up is your own note; it credits nobody. Help is still logged by the person who did it and confirmed by a neighbor.",
  },
  {
    q: "Why do I have to pick a neighborhood?",
    a: "Everything on Peoplearound is local. Your neighborhood decides which projects, events, and people you see. Your precise location is used once to find it and never stored.",
  },
];

async function HelpPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  return (
    <>
      <main className="w-full max-w-3xl flex-1 p-4 lg:py-6 lg:pl-36 lg:pr-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Help Center</h1>
        <p className="mt-1 text-sm text-black/50 dark:text-white/50">
          Build ideas with your communities. Here is how it all works.
        </p>

        <ul className="mt-6 flex flex-col gap-3">
          {FAQ.map((item) => (
            <li
              key={item.q}
              className="rounded-2xl border border-slate-300 bg-white p-5 shadow-sm dark:border-slate-600 dark:bg-zinc-900"
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
    </>
  );
}

/**
 * The frame first, the content when it's ready.
 *
 * The shell streams at the first byte with a skeleton where the body will
 * land, and the body follows when its reads answer. The page used to hold
 * the whole document until the last query came back.
 */
export default function Page() {
  return (
    <AppShell>
      <Suspense fallback={<ContentSkeleton />}>
        <HelpPage />
      </Suspense>
    </AppShell>
  );
}
