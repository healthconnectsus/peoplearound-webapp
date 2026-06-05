import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { CATEGORIES } from "@/lib/goals";
import { createGoal } from "../actions";

export default async function NewGoalPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const inputClass =
    "rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-white/20";

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-xl flex-1 p-4">
        <h1 className="mb-1 text-lg font-semibold">Declare a goal</h1>
        <p className="mb-5 text-sm text-black/60 dark:text-white/60">
          Something real you want to achieve — the people around you can help.
        </p>

        {error ? (
          <p className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        ) : null}

        <form action={createGoal} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Title</span>
            <input
              type="text"
              name="title"
              required
              maxLength={140}
              placeholder="Start a community garden on Oak Street"
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Description</span>
            <textarea
              name="description"
              rows={5}
              maxLength={4000}
              placeholder="What are you trying to do, and what would help?"
              className={`${inputClass} resize-y`}
            />
          </label>

          <div className="flex gap-4">
            <label className="flex flex-1 flex-col gap-1 text-sm">
              <span className="font-medium">Category</span>
              <select name="category" defaultValue="community" className={`${inputClass} capitalize`}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} className="capitalize">
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-1 flex-col gap-1 text-sm">
              <span className="font-medium">Start as</span>
              <select name="state" defaultValue="idea" className={inputClass}>
                <option value="idea">Idea</option>
                <option value="active">Active</option>
              </select>
            </label>
          </div>

          <div className="mt-2 flex gap-2">
            <button
              type="submit"
              className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
            >
              Create goal
            </button>
            <Link
              href="/"
              className="rounded-full border border-black/15 px-5 py-2 text-sm font-medium transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
