# Architecture

Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4, Supabase,
deployed on Vercel. No state library, no chart library, no component library
beyond two hand-rolled primitives.

## The one rule everything bends around

**The app works with zero backend.** A kid opens it in a gym with no Wi-Fi and
every game is playable, scored, and saved. Every feature added since has kept
that true: each Supabase client returns `null` when its env vars are absent and
callers degrade instead of failing.

```
src/lib/supabase/client.ts   getSupabaseBrowser()  -> null without env vars
src/lib/supabase/server.ts   getSupabaseServer()   -> null without env vars
src/lib/supabase/service.ts  getSupabaseService()  -> null without service key
src/lib/linear.ts            linearEnabled()       -> false without API key
```

This is why the store is localStorage-first and the schema mirrors it 1:1, and
why telemetry queues to localStorage rather than awaiting a network call.

## Layers

**Content** (`src/content/*.ts`) — vocab, alphabet, greetings, phrases, regions,
games, badges. Plain TypeScript constants. This is what the games render and it
stays the offline source of truth.

**Items** (`src/lib/items.ts` + `content_items`) — every question the games can
ask has a stable id derived from content: `vocab:ake:v1`, `letter:Ә:v1`. Derived,
not generated, so a client computes one offline with no round trip. The table is
produced from the same TS modules by `scripts/gen-items.mjs`, which imports them
via Node type-stripping rather than parsing them, so the two cannot drift.

**Profile store** (`src/lib/store.ts`) — the kid's XP, badges, artifacts, mastery.
localStorage, with fire-and-forget sync helpers in `src/lib/supabase/sync.ts`.

**Telemetry** (`src/lib/telemetry.ts` + `learning_events`) — one row per answer.
See [telemetry.md](telemetry.md).

**Team surfaces** — `/dashboard`, `/ideas`, `/label`, `/admin/*`, `/facilitator`.
Server components behind `requireTeam()`. These are the only places that read
across rows, and RLS enforces that independently of the guard.

## Identity

Two populations, opposite treatment:

- Kids: anonymous, `crypto.randomUUID()` profile id in localStorage, anon key
  writes only.
- Team: Supabase Auth magic link → a row in `team_members` with a role. Reads
  across rows require `is_team()`.

`requireTeam()` returns a synthetic local-admin when Supabase is unconfigured, so
the offline demo does not lock itself out of its own tools.

## Server actions over API routes

Mutations are server actions (`src/app/*/actions.ts`). Route handlers exist only
where something external calls in or a secret must be held server-side:

| Route | Why it is a route |
|---|---|
| `/auth/callback` | Supabase redirects a browser here |
| `/auth/signout` | Plain form POST |
| `/api/transcribe` | Holds `ELEVENLABS_API_KEY` |
| `/api/linear/webhook` | Linear posts to it |

## Next 16 notes

Read `node_modules/next/dist/docs/` before writing routing code — this version
differs from most training data. In particular: middleware is called **proxy**
(`proxy.ts`, default export `proxy`), `cookies()` is async, and `params` /
`searchParams` are Promises. This app deliberately has no proxy file; auth checks
live in server components and route handlers, which is what the Next docs
recommend over optimistic proxy checks.
