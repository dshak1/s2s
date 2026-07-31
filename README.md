# Steppe to Screen

A Kazakh language + culture learning platform for kids 5–12, built for the
UBC/SFU CC-UNESCO workshop series. One projector, kids on phones/iPads, craft
materials on the tables — ten games, a facilitator console, and outcome metrics.

## Quick start

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

The app runs **fully offline** — no login or backend required. Progress, art,
badges and `game_runs` persist in `localStorage`. See **DEMO.md** for the
5-minute walkthrough and **DECISIONS.md** for every design choice.

## The ten games (`/play`)

| Game | Kazakh | What it teaches |
|------|--------|-----------------|
| Sound It Out | Дыбыс | Hear a Kazakh letter sound and pick the Cyrillic letter |
| Word Match | Сөз сәйкестік | Match English prompts or pictures to Kazakh words |
| Memory Match | Естен қалдырма | Pair English and Kazakh cards |
| Falling Words | Құлайтын сөздер | Catch English prompts in Kazakh baskets |
| Where in Kazakhstan? | Қайда? | Drop a pin on a stylized Kazakhstan map |
| Steppe Bazaar | Базар | Food vocab, quantities, and teńge addition |
| Snow Leopard Patrol | Қар барысы | QR scavenger hunt across the room |
| Flashlight Words | Жарық | Fullscreen projector/touch word hunt |
| Design Your Avatar | Сурет салу | Draw or upload art → it becomes your avatar |
| Story Maker | Әңгіме | Comic from the kid's own art |

## Routes
- `/` landing · `/join` kid join · `/play` games hub
- `/profile/[id]` kid hub (avatar, mastery, yurt, badges, gallery)
- `/quest` + `/quest/[region]` legacy region routes; `/play` is the Silk Road hub
- `/facilitator` console · `/facilitator/[code]/live` projector · `/facilitator/[code]/print` printable QR hunt

### Team surfaces (magic-link sign-in at `/login`)
- `/dashboard` item analysis, weekly activity, coverage
- `/ideas` triage board — votes, comments, attachments, required decision notes
- `/label` content labelling queue with voice notes
- `/admin/team` roles · `/admin/content` facilitator content tools · `/admin/feedback`

## Docs

Full internal documentation is in **[docs/](docs/README.md)**:
[setup](docs/setup.md) · [architecture](docs/architecture.md) ·
[data model](docs/data-model.md) · [telemetry](docs/telemetry.md) ·
[labelling guide](docs/labelling-guide.md) · [research](docs/research.md) ·
[security](docs/security.md) · [roadmap](docs/roadmap.md) ·
[demo script](docs/demo-script.md).

## Going to a real backend (Supabase + Vercel)
1. Create a Supabase project and run everything in `supabase/migrations/` in order.
2. Set env vars (see `.env.example`).
3. Add `<origin>/auth/callback` to Supabase → Authentication → Redirect URLs.
4. Deploy to Vercel. The Supabase helpers in `src/lib/supabase/` activate
   automatically when the env vars are present. The first person to sign in
   becomes the admin.

Regenerate generated files after editing content: `node scripts/gen-seed.mjs`,
`node scripts/gen-svgs.mjs`,
`node --experimental-strip-types scripts/gen-items.mjs`.

## Stack
Next.js 16 (App Router, React 19, TS strict) · Tailwind v4 · Framer Motion ·
TanStack Query · Zod · qrcode · Supabase (@supabase/ssr).
