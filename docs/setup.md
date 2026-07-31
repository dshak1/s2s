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

**1. Site URL and Redirect URLs.** Authentication → URL Configuration.

Set **Site URL** to `https://s2s-ten.vercel.app`. This matters more than it
looks: when a requested redirect isn't in the allow-list, Supabase silently
falls back to Site URL, and the default is `http://localhost:3000` — which on
this machine is a different project entirely. The sign-in link lands there with
the code attached and nothing works.

Then add to **Redirect URLs**:

```
http://localhost:3100/auth/callback
https://s2s-ten.vercel.app/auth/callback
```

**2. The first sign-in.** Go to `/login` and request a link. Whoever signs in
first becomes `admin` automatically (see `ensure_team_member`). Everyone after
that lands as `pending` with no access at all; the admin gives them a role at
`/admin/team`.

Pending is not an inconvenience to design around — `signInWithOtp` creates an
account for **any** email that asks, so a sign-in link only proves someone owns
an inbox. Approval is what proves they're on the team.

## Roles

| Role | Can |
|---|---|
| `pending` | Nothing. Sees a "waiting for approval" screen |
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
