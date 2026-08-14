# Steppe to Screen

Kazakh language + culture learning for kids (ages 5–12). Built for the UBC/SFU CC-UNESCO workshop series. One projector, kids in the room, daily iteration.

## What it is

A game hub (Next.js) with Learn / play loops: vocab, places, greetings, sound-it-out, and more. Kids tap through games. The team watches what actually happens, not what we hoped would happen.

## The product experiment that matters

**Feedback is not a form.** When a tester hits a problem they tap feedback and it captures **their voice plus the screen**, so we see the exact issue instead of a vague "it broke." The rest of the team can label from that clip. Design → ship → kids test the same day → clip → fix.

That is the whole loop: decent UI, real backend, lots of small experiments, users every day.

## Recent (Aug 2026)

- Restored the v2 game hub (prod had been a mix of old committed code and unstaged working-tree files)
- First-run `/welcome` was 404ing every new session — the gate existed, the page did not. Fixed, then added a preflight check so nav links cannot point at missing routes again
- Preflight suite (`pnpm preflight`): committed tree typechecks in isolation, referenced `/public` assets must be in git, no kid-facing em dashes

## Stack

TypeScript, Next.js, Supabase, Capacitor (iOS/Android shell).

## Run

```bash
pnpm install
pnpm dev
pnpm preflight
```
