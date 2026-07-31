# Setup

## Run it

```bash
pnpm install
./node_modules/.bin/next dev -p 3100     # pnpm dev needs a TTY; this doesn't
```

The app runs **fully without any environment variables** — localStorage demo
mode, every game playable, no login. That is deliberate and must stay true.

## Environment variables

Copy `.env.example` to `.env.local`. Nothing is required; each var switches on
one capability.

| Var | Turns on |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The real backend: telemetry, team accounts, dashboard, ideas, labelling |
| `SUPABASE_SERVICE_ROLE_KEY` | The Linear webhook only (it has no user session to act as) |
| `LINEAR_API_KEY` (+ `LINEAR_TEAM_ID`, `LINEAR_WEBHOOK_SECRET`) | Filing decided ideas into Linear, and status flowing back |
| `ELEVENLABS_API_KEY` | Transcribing voice notes on the labelling queue |
| `NEXT_PUBLIC_LITE=1` | Cut-down deployment: only Sound It Out + Greetings Quiz |

Supabase project: `coqvobzfbnidkgshrmqm`. Production: <https://s2s-ten.vercel.app>.

## Two manual steps in the Supabase dashboard

Magic-link sign-in cannot work until these are done, and they cannot be done
from code.

**1. Redirect URLs.** Authentication → URL Configuration → Redirect URLs, add:

```
http://localhost:3100/auth/callback
https://s2s-ten.vercel.app/auth/callback
```

**2. The first sign-in.** Go to `/login` and request a link. Whoever signs in
first becomes `admin` automatically (see `ensure_team_member` in
`supabase/migrations/0005_identity.sql`). Everyone after that lands as
`observer`; the admin promotes them at `/admin/team`.

## Roles

| Role | Can |
|---|---|
| `admin`, `dev` | Everything, including deciding on ideas and changing roles |
| `educator`, `native_speaker`, `learner`, `observer` | View the dashboard, submit and vote on ideas, comment, label content |

## Migrations

`supabase/migrations/` is the source of truth, applied in order. `0007_seed_items.sql`
is generated — regenerate it after editing any content file:

```bash
node --experimental-strip-types scripts/gen-items.mjs
```

## Deploying

```bash
vercel deploy --prod
```

Work happens on `feat/pro-infra` and is pushed directly — this project does not
use pull requests.
