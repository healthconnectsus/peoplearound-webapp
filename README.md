# Peoplearound — Webapp

**Build ideas with your communities.**

> Where Facebook makes you say who you are, Peoplearound shows what you have built with the people around you — and who was on the team.

Peoplearound is a hyperlocal network where people share ideas and projects, and the neighbors around them **join in** to bring them to life. Anyone can star a project ("I'd be glad this existed"), or ask to join it — the founder approves requests, and the team builds together. Every contribution is **attributed**, **confirmed by others**, and **recorded permanently**.

This repository is the **web application** (Next.js + Supabase, deployed on Vercel). Product documentation lives in [`docs/`](docs/).

---

## What's implemented

- **Projects** — living pages with a lifecycle (`idea → active → completed`, or quietly `archived` — never "failed"). Create at [`/projects/new`](src/app/projects/new/page.tsx), browse the feed at `/`, view detail at `/projects/[id]`.
- **AI idea shaping** — on the create page, describe your idea in your own words (typed, or **dictated via the mic button** using the browser's Web Speech API). Claude shapes it into a clear title, description, category, and stage, and prefills the form — everything stays editable. Served by [`/api/shape-idea`](src/app/api/shape-idea/route.ts) using structured outputs (`claude-opus-4-8`).
- **Stars** — one per neighbor per project; the low-commitment "I'd be glad this existed" signal.
- **Memberships (join flow)** — neighbors *request to join* a project; the founder accepts or declines. Accepted members appear in "The team"; members can leave at any time; the founder can remove members. Enforced by RLS (a user cannot accept their own request).
- **Auth** — email/password + magic link via Supabase Auth, with session refresh and route protection in `src/proxy.ts`.
- **Navigation shell** — Nextdoor-style desktop chrome: left sidebar ([`Sidebar`](src/components/Sidebar.tsx)) with Local Faves / Groups / Events / People around / My ideas / My community (+ neighborhood idea counters), and a top bar ([`TopBar`](src/components/TopBar.tsx)) with project search, a live notifications bell (join requests + fresh stars), a messages placeholder, and the profile menu. Mobile keeps the compact top header. Icons are [lucide](https://lucide.dev) outline icons.
- **Profile** — [`/profile`](src/app/profile/page.tsx) with cover + avatar photos, bio, pronouns, hometown, website, a private dashboard (ideas / stars / teams / confirmed help), faves, and your ideas. Edited at [`/settings`](src/app/settings/page.tsx) (Nextdoor-style per-section saves; photos upload to the public `profiles` storage bucket — requires migration `0010`).
- **Community pages** — [`/faves`](src/app/faves/page.tsx) (most-starred projects), [`/events`](src/app/events/page.tsx), [`/people`](src/app/people/page.tsx) (neighbors + remote helpers), [`/ideas`](src/app/ideas/page.tsx), [`/connections`](src/app/connections/page.tsx) (teammates), plus Help Center and Invite pages.

## Tech stack

- **Framework** — [Next.js 16](https://nextjs.org) (App Router) + React 19 + TypeScript
- **Styling** — Tailwind CSS v4
- **Auth & data** — [Supabase](https://supabase.com) (Auth, Postgres, RLS) via `@supabase/ssr`
- **AI** — [Claude API](https://platform.claude.com) via `@anthropic-ai/sdk` (idea shaping)
- **Hosting** — [Vercel](https://vercel.com)

> Note: Next.js 16 renamed the `middleware` convention to **`proxy`** — session refresh + route protection live in [`src/proxy.ts`](src/proxy.ts).

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
#    then fill in your Supabase URL + publishable key

# 3. Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Unauthenticated visits redirect to `/login`.

### Environment variables

| Variable | Where | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | Your project's REST URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | The **publishable** key (safe to expose) |
| `SUPABASE_SECRET_KEY` | server only | **Never** commit or expose. Used for admin tasks only. |
| `ANTHROPIC_API_KEY` | server only | Powers AI idea shaping (`/api/shape-idea`). Without it the assistant returns a friendly "not configured" message; the manual form still works. |
| `VERCEL_TOKEN` | local only | Lets `npm run ship` deploy via the Vercel CLI |
| `SUPABASE_ACCESS_TOKEN` / `SUPABASE_PROJECT_REF` | local only | Let `scripts/db-apply.mjs` run migrations via the Supabase Management API |

Real values go in `.env.local` (gitignored). On Vercel, set the first four in **Project → Settings → Environment Variables**.

## Database & migrations

Schema lives in [`supabase/migrations/`](supabase/migrations/), applied with:

```bash
node scripts/db-apply.mjs supabase/migrations/000X_name.sql
```

| Migration | What it adds |
|---|---|
| `0001_profiles_and_goals.sql` | `profiles` (auto-created per auth user) + the original goals table |
| `0002_rename_goals_to_projects.sql` | The pivot: renames table/enum/indexes/constraints `goals` → `projects` |
| `0003_stars.sql` | `stars` — one per user per project, RLS'd |
| `0004_memberships.sql` | `memberships` — `pending`/`accepted` join requests; owner-only approval, self-service leave, all via RLS |

All migrations are idempotent (safe to re-run).

## Ship workflow

```bash
npm run ship -- "your commit message"
```

One command: writes a dated entry to [`progress.md`](progress.md) → commits → pushes to GitHub → deploys to Vercel (CLI if `VERCEL_TOKEN` is set, otherwise Git integration).

## Auth flow

- Email + password sign-in / sign-up and magic-link, all via Supabase Auth.
- Email confirmation + magic links are verified at [`src/app/auth/confirm/route.ts`](src/app/auth/confirm/route.ts) (supports both `token_hash` and PKCE `code` flows).
- [`src/proxy.ts`](src/proxy.ts) refreshes the session on every request and redirects unauthenticated users to `/login`.

## Version display

The login page footer shows `vX.Y.Z · <commit>`. The commit SHA is injected at build time in [`next.config.ts`](next.config.ts) (from `VERCEL_GIT_COMMIT_SHA` on Vercel, or local `git` otherwise).

## Project conventions

- Every commit is documented in [`progress.md`](progress.md).
- Product docs: [`docs/`](docs/) — see [Concept](docs/CONCEPT.md), [PRD](docs/PRD.md), [Architecture](docs/ARCHITECTURE.md), and others.
