import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { CATEGORIES, CATEGORY_META } from "@/lib/projects";
import { createProject } from "../actions";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const inputClass =
    "rounded-xl border border-black/15 bg-transparent px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-emerald-500 dark:border-white/20";

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-xl flex-1 p-4">
        <h1 className="mb-1 text-xl font-semibold">Share your idea 💡</h1>
        <p className="mb-6 text-sm text-black/60 dark:text-white/60">
          Tell the people around you what you want to build. They can star it,
          or ask to join and help make it happen.
        </p>

        {error ? (
          <p className="mb-4 rounded-xl border border-red-300 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        ) : null}

        <form action={createProject} className="flex flex-col gap-5">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">What&apos;s the idea?</span>
            <input
              type="text"
              name="title"
              required
              maxLength={140}
              placeholder="Start a community garden on Oak Street"
              className={inputClass}
            />
            <span className="text-xs text-black/40 dark:text-white/40">
              One clear sentence works best.
            </span>
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">
              Tell people more{" "}
              <span className="font-normal text-black/40 dark:text-white/40">
                (optional)
              </span>
            </span>
            <textarea
              name="description"
              rows={5}
              maxLength={4000}
              placeholder="What's the plan? What kind of help or skills would be great to have?"
              className={`${inputClass} resize-y`}
            />
          </label>

          <fieldset className="flex flex-col gap-1.5 text-sm">
            <legend className="mb-1.5 font-medium">
              What kind of project is it?
            </legend>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c, i) => (
                <label key={c} className="cursor-pointer">
                  <input
                    type="radio"
                    name="category"
                    value={c}
                    defaultChecked={i === 0}
                    className="peer sr-only"
                  />
                  <span className="inline-block rounded-full border border-black/15 px-3.5 py-1.5 transition-colors peer-checked:border-emerald-600 peer-checked:bg-emerald-600 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500/50 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10">
                    {CATEGORY_META[c].emoji} {CATEGORY_META[c].label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-1.5 text-sm">
            <legend className="mb-1.5 font-medium">Where are you at?</legend>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="flex-1 cursor-pointer">
                <input
                  type="radio"
                  name="state"
                  value="idea"
                  defaultChecked
                  className="peer sr-only"
                />
                <span className="flex h-full flex-col gap-0.5 rounded-xl border border-black/15 px-4 py-3 transition-colors peer-checked:border-emerald-600 peer-checked:bg-emerald-50 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500/50 hover:bg-black/5 dark:border-white/20 dark:peer-checked:bg-emerald-950/40 dark:hover:bg-white/10">
                  <span className="font-medium">💭 Just an idea</span>
                  <span className="text-xs text-black/50 dark:text-white/50">
                    Looking for people to make it real
                  </span>
                </span>
              </label>
              <label className="flex-1 cursor-pointer">
                <input
                  type="radio"
                  name="state"
                  value="active"
                  className="peer sr-only"
                />
                <span className="flex h-full flex-col gap-0.5 rounded-xl border border-black/15 px-4 py-3 transition-colors peer-checked:border-emerald-600 peer-checked:bg-emerald-50 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500/50 hover:bg-black/5 dark:border-white/20 dark:peer-checked:bg-emerald-950/40 dark:hover:bg-white/10">
                  <span className="font-medium">🚀 Already building</span>
                  <span className="text-xs text-black/50 dark:text-white/50">
                    Under way — more hands welcome
                  </span>
                </span>
              </label>
            </div>
          </fieldset>

          <div className="mt-1 flex items-center gap-3">
            <button
              type="submit"
              className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
            >
              Share it 🎉
            </button>
            <Link
              href="/"
              className="text-sm text-black/50 hover:underline dark:text-white/50"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
