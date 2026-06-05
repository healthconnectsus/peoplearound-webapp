# Peoplearound — Webapp

**Achieve goals together.**

> Where Facebook makes you say who you are, Peoplearound shows what you have done for the people around you — and who confirmed it.

Peoplearound is a hyperlocal network where people declare real-world goals and the neighbors around them help achieve them. Every contribution is **attributed**, **confirmed by others**, and **recorded permanently**.

This repository is the **web application** (Next.js + Supabase, deployed on Vercel). Product documentation lives in [`docs/`](docs/).

---

## Tech stack

- **Framework** — [Next.js 16](https://nextjs.org) (App Router) + React 19 + TypeScript
- **Styling** — Tailwind CSS v4
- **Auth & data** — [Supabase](https://supabase.com) (Auth, Postgres, RLS) via `@supabase/ssr`
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
| `SUPABASE_SECRET_KEY` | server only | **Never** commit or expose. Not used by the app yet. |

Real values go in `.env.local` (gitignored). On Vercel, set them in **Project → Settings → Environment Variables**.

## Auth flow

- Email + password sign-in / sign-up and magic-link, all via Supabase Auth.
- Email confirmation + magic links are verified at [`src/app/auth/confirm/route.ts`](src/app/auth/confirm/route.ts) (supports both `token_hash` and PKCE `code` flows).
- [`src/proxy.ts`](src/proxy.ts) refreshes the session on every request and redirects unauthenticated users to `/login`.

## Version display

The login page footer shows `vX.Y.Z · <commit>`. The commit SHA is injected at build time in [`next.config.ts`](next.config.ts) (from `VERCEL_GIT_COMMIT_SHA` on Vercel, or local `git` otherwise).

## Project conventions

- Every commit is documented in [`progress.md`](progress.md).
- Product docs: [`docs/`](docs/) — see [Concept](docs/CONCEPT.md), [PRD](docs/PRD.md), [Architecture](docs/ARCHITECTURE.md), and others.
