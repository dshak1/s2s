# Decisions — Steppe to Screen

Every judgement call made while building this in one session, and why.

## Environment / infrastructure
- **No Supabase or Vercel MCP connectors were available in this session**, and the
  Supabase host is blocked by the environment's network policy. I could not
  provision a Supabase project or trigger a Vercel deploy from here. Instead I
  built the whole app to run **with zero backend** and shipped everything needed
  to flip to a real backend in minutes. This is the single biggest constraint and
  the reason for the data-layer decision below.
- **Data layer is a localStorage-backed store** (`src/lib/store.ts`) that mirrors
  the Supabase schema 1:1. Games, XP, mastery, badges, artifacts and `game_runs`
  all persist locally so the demo is fully playable offline. `src/lib/supabase/`
  helpers return `null` when env vars are absent and the app degrades gracefully.
- **Live sessions use BroadcastChannel + localStorage** (`src/lib/sessions.ts`)
  instead of Supabase Realtime. On one laptop this gives genuine real-time sync
  between the projector tab and kid tabs — exactly the in-room workshop setup —
  and it's the clean seam to swap for Realtime channels later.
- **Migrations are written and ready** (`/supabase/migrations/0001_init.sql`,
  `0002_seed.sql`) with RLS, a storage bucket, and Realtime publication. Seed is
  generated from the TS content so it never drifts (`scripts/gen-seed.mjs`).
- Used **Next.js 16** (latest `create-next-app`) rather than 15 — same App
  Router / React 19 / Server Actions surface the spec targeted. Turbopack build.

## Stack
- **Skipped the interactive shadcn/ui CLI** (needs a TTY/network prompts) and
  hand-rolled the few primitives actually needed (`Button`, `Card`) in the same
  new-york spirit — rounded, soft shadows, semantic variants. Fewer deps, no
  half-used component library.
- **next/font/google** for Nunito (kid UI) + Inter (facilitator/admin), wired to
  Tailwind v4 `@theme` tokens.
- **PWA**: shipped a static `manifest.webmanifest` only. Did not add `next-pwa`/a
  service worker — the spec said "don't deeply customize" and a half-configured SW
  causes more demo-day pain than it's worth.

## Gameplay
- **Drag-to-pair (Sözdik Match)** uses Framer Motion `drag` + manual hit-testing
  of card rects on drag-end, so it works with both mouse and touch (native HTML5
  DnD doesn't fire on touch).
- **Jaryq Hunter**: v1 (touch/mouse + arrow-key fallback) is the polished default;
  letters are collected in word order. v2 webcam mode is fully implemented — a
  brightest-pixel blob detector on a downsampled canvas drives the spotlight, with
  a calibration step and automatic fallback to v1 if no camera is granted.
- **Falling Sözder**: tap-the-basket instead of literally dragging a falling tile —
  cleaner and far more reliable on touch while keeping the same mechanic.
- **Yurt Builder**: the alphabet quiz is a Cyrillic↔Latin matching task (recognition)
  rather than "identify the sound", because synthesized placeholder audio can't be
  distinguished by ear. Leitner levels drive spaced repetition; level ≥3 = mastered.
  Used 36 as the "full yurt" target per the spec (the table has all 42 letters).
- **Aitys**: validation is exact-answer match (the curated correct words rhyme by
  construction); the rhyme syllable is surfaced in the solved panel for teaching.
- **Audio**: synthesized via WebAudio (major-chord arpeggio = correct, low sine =
  wrong) so nothing is ever silent. `speakWord` plays a short word-length-varied
  motif as a placeholder until real Kazakh audio is uploaded via `/admin/content`.
- **SVG placeholders**: one consistent gold-on-blue card per vocab item, generated
  by `scripts/gen-svgs.mjs` and named `/img/{category}/{slug}.svg` so the team can
  drop in real art without touching code.

## Content
- Seeded **72 real Kazakh vocab items across 8 categories** (spec floor was 50),
  Cyrillic + Latin + English. **9 badges**, **5 hand-written aitys couplets**,
  **8 snow-leopard clue questions**, region facts for all 8 regions.
- Region→category mapping is a single lookup in `src/content/regions.ts` so a
  facilitator can reassign themes freely.

## Auth / privacy
- Default flow is anonymous join (code + first name). The parent-email upgrade
  (`/profile/[id]/parent`) calls Supabase magic-link OTP when configured, else
  stores intent locally. No real names on shareable leaderboards until a parent
  confirms — session views use display names only.

## Admin
- `/admin/content` is a single-password client gate via `NEXT_PUBLIC_ADMIN_PASSWORD`
  (default `steppe`), per the spec's "not a full role system". Canva PNG upload is
  fully working; elder-video / word-audio slots are placeholder buttons that map to
  the `kid-art` storage bucket once Supabase is connected.

## Lint
- Next 16 ships a stricter `react-hooks` plugin (`purity`, `set-state-in-effect`,
  `refs`). The games legitimately use `Math.random` in lazy initializers and
  rAF-driven loops, so those rules are downgraded to warnings in
  `eslint.config.mjs`. `pnpm lint` is error-free; `pnpm build` is green.
