<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

Breaking changes here. APIs, conventions, file structure may differ from training data. Read guide in `node_modules/next/dist/docs/` before code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## MCP React/shadcn Capability

**Active 2026-08-01:** Cursor MCP server init for React components.

```bash
npx shadcn@4.15.0 mcp init --client cursor
```

Cursor-only — this MCP server does not reach Claude Code, they're separate
tool configs. A local `shadcn add` run from Cursor already clobbered
`utils.ts`/`Button.tsx`/`globals.css` once (2026-08-03, recovered) by
generating over hand-written project files with generic shadcn output. If
pulling a component via the CLI, review the diff before trusting it — this
repo's `components.json` has `@react-bits` and `@magicui` custom registries
already wired for that (`npx shadcn add @magicui/<name>`).

## Project: Steppe to Screen

Kazakh-language games for kids 5–12. Kids are anonymous (localStorage-first,
zero backend required); the team signs in with a magic link. Full context,
architecture, and history live in `docs/` — start at `docs/README.md`, and
see `docs/session-log.md` for what's shipped and why.

Two build-time flags gate features not ready for public traffic (both in
`src/lib/online-features.ts`):
- `NEXT_PUBLIC_ONLINE_FEATURES` (env var, unset = off) — facilitator console,
  `/join`, and the live multi-table race. Flip in Vercel env vars when ready,
  no code change needed.
- `GAME_BUILDER_ENABLED` (hardcoded `false`) — the `/play/create` game
  builder's output needs a redesign before it ships; this one's a code flip,
  not an env var.

Vocab entries in `src/content/vocab.ts` marked `aiDrafted: true` (weather/
school/nature categories, added 2026-08-03) are AI-generated and not yet
checked by a native speaker — spot-check before leaning on them for a real
workshop.

## Visual design: use the system, don't invent one per screen

Two standing rules, both from repeated playtest feedback.

**1. No glows, halos, or gradient CTAs.** `src/components/ui/button.tsx` is
explicit that this project is flat colour plus a hard, unblurred offset shadow
— "reads as a felt tile you press, not a generic SaaS CTA pill". A soft
coloured `shadow-[0_0_24px_rgba(...)]` behind a button, a neon border, an
emerald-on-near-black pill: these read instantly as generated filler and have
been called out by name more than once. If a control needs emphasis, use the
existing `Button` variants and the project palette (steppe / gold / terra /
felt). Do not hand-roll a new visual treatment for one screen.

**2. Reach for the component library before hand-writing UI.** `components.json`
already has `@react-bits` and `@magicui` wired as custom registries alongside
shadcn, so pulling a real component is one command:

```bash
npx shadcn add @magicui/<name>
```

Hand-rolling bespoke markup per screen is what produces the inconsistent,
obviously-AI look. Prefer a library component, then restyle it to the palette.

**Review the diff either way.** A `shadcn add` run from Cursor once clobbered
`utils.ts`, `Button.tsx` and `globals.css` with generic output (2026-08-03).
Never accept a registry write unreviewed.

**Experimental mode is a moment, not a theme.** It used to force a dark palette
over the whole app with `!important` and lay a permanent animated wave grid on
top of the content. It is now a single tide wash on entry plus a small corner
badge (`src/components/experimental-mode.tsx`); the app looks normal
afterwards. Do not reintroduce a persistent overlay or a global recolour.

