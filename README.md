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
- `/admin/content` password-gated content tools

## Going to a real backend (Supabase + Vercel)
1. Create a Supabase project; run `supabase/migrations/0001_init.sql` then `0002_seed.sql`.
2. Set env vars (see `.env.example`): `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
3. Deploy to Vercel. The Supabase helpers in `src/lib/supabase/` activate
   automatically when the env vars are present.

Regenerate seed/art after editing content: `node scripts/gen-seed.mjs`,
`node scripts/gen-svgs.mjs`.

## Stack
Next.js 16 (App Router, React 19, TS strict) · Tailwind v4 · Framer Motion ·
TanStack Query · Zod · qrcode · Supabase (@supabase/ssr).
