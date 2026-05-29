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
| Sözdik Match | Сөздік сәйкестік | Drag words to pictures (3 modes) |
| Tańba Studio | Таңба студиясы | Draw your tańba → it becomes your avatar |
| Dala Quest | Дала квесі | Steppe-map hub, 8 unlockable regions |
| Jaryq Hunter | Жарық аңшысы | Flashlight-in-the-dark (touch + webcam) |
| Esten Qaldyrma | Естен қалдырма | Flip-card memory |
| Aitys Battle | Айтыс | Fill the rhyming Kazakh couplet |
| Falling Sözder | Құлайтын сөздер | Catch falling words into baskets |
| Yurt Builder | Үй құрушы | Master letters → build an SVG yurt |
| Snow Leopard Patrol | Қар барысы | QR scavenger hunt across the room |
| Story Maker | Әңгіме жасаушы | Comic from the kid's own art |

## Routes
- `/` landing · `/join` kid join · `/play` games hub
- `/profile/[id]` kid hub (avatar, mastery, yurt, badges, gallery)
- `/quest` + `/quest/[region]` Dala Quest
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
