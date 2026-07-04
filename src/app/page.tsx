import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/SiteHeader";
import { STATE_META, categoryMeta, timeAgo, type Project } from "@/lib/projects";
import { versionLabel } from "@/lib/version";

type ProjectCardData = Project & {
  starCount: number;
  collaboratorCount: number;
};

function ProjectCard({ project }: { project: ProjectCardData }) {
  const meta = STATE_META[project.state];
  const cat = categoryMeta(project.category);
  return (
    <li>
      <Link
        href={`/projects/${project.id}`}
        className="block rounded-2xl border border-black/10 p-4 transition-all hover:-translate-y-0.5 hover:border-emerald-500/50 hover:shadow-md hover:shadow-emerald-500/5 dark:border-white/10 dark:hover:bg-white/[0.03]"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-medium leading-snug">
            <span className="mr-1.5" aria-hidden>
              {cat.emoji}
            </span>
            {project.title}
          </h2>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${meta.badge}`}
          >
            {meta.label}
          </span>
        </div>
        {project.description ? (
          <p className="mt-1.5 line-clamp-2 text-sm text-black/60 dark:text-white/60">
            {project.description}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-black/45 dark:text-white/45">
          <span>{project.owner?.display_name ?? "Someone"}</span>
          <span aria-hidden>·</span>
          <span>{timeAgo(project.created_at)}</span>
          <span aria-hidden>·</span>
          <span title="People building this">
            🤝 {project.collaboratorCount}
          </span>
          <span title="People who'd love this to exist">
            ⭐ {project.starCount}
          </span>
        </div>
      </Link>
    </li>
  );
}

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The proxy already guards this route, but guard here too as defense in depth.
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("projects")
    .select(
      // profiles is reachable via several FKs now (owner, memberships, stars),
      // so the owner embed must name its constraint explicitly.
      "id,owner_id,title,description,category,state,created_at,updated_at,owner:profiles!projects_owner_id_fkey(display_name)",
    )
    .order("created_at", { ascending: false });

  const projects = (data ?? []) as unknown as Project[];

  // Tally star + accepted-collaborator counts per project in two flat queries.
  const [{ data: starRows }, { data: memberRows }] = await Promise.all([
    supabase.from("stars").select("project_id"),
    supabase.from("memberships").select("project_id").eq("status", "accepted"),
  ]);

  const starCounts = new Map<string, number>();
  for (const s of starRows ?? []) {
    starCounts.set(s.project_id, (starCounts.get(s.project_id) ?? 0) + 1);
  }
  const collaboratorCounts = new Map<string, number>();
  for (const m of memberRows ?? []) {
    collaboratorCounts.set(
      m.project_id,
      (collaboratorCounts.get(m.project_id) ?? 0) + 1,
    );
  }

  const cards: ProjectCardData[] = projects.map((p) => ({
    ...p,
    starCount: starCounts.get(p.id) ?? 0,
    collaboratorCount: collaboratorCounts.get(p.id) ?? 0,
  }));

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 p-4">
        <div className="mb-5">
          <h1 className="text-lg font-semibold">Projects around you</h1>
          <p className="text-sm text-black/50 dark:text-white/50">
            Ideas your neighbors are building — join one, or share your own.
          </p>
        </div>

        {cards.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/15 p-10 text-center dark:border-white/15">
            <p className="text-3xl" aria-hidden>
              🌱
            </p>
            <p className="mt-3 font-medium">Nothing here yet</p>
            <p className="mt-1 text-sm text-black/60 dark:text-white/60">
              Got an idea for your neighborhood? Big or small, this is the
              place to share it.
            </p>
            <Link
              href="/projects/new"
              className="mt-5 inline-block rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
            >
              Share your idea
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {cards.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </ul>
        )}
      </main>

      <footer className="p-4 text-center text-xs text-black/40 dark:text-white/40">
        {versionLabel()}
      </footer>
    </div>
  );
}
