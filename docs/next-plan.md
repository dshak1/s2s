# Steppe to Screen: make it stick, then make it fun

## Context

Read `docs/session-log.md` first. It lists every idea from the build so far and
what happened to it. Read `docs/team-context.md` second: it is the WhatsApp group
distilled, and it changes the priorities below.

The infrastructure is done. Identity, telemetry, tickets, labelling, dashboard,
recovery codes, real map, real photos, all shipped and deployed. What is left
splits into two things:

1. **Two bugs that make the product feel broken**, one of which Diar hit twice.
2. **The app is boring.** His words. Everything below the bugs is about that.

The WhatsApp export moved two items up the list. A Maze research session was
lost because parents could not get kids connected over Zoom, so onboarding
friction is the proven bottleneck. And the team pays for **Kahoot Pro** and
renews it, so a facilitator-led live round is the thing that would let them stop.

Written to be executed by a cheaper model. Every task names its files, and the
verification is concrete. Do not re-derive decisions; they are recorded here.

**Standing rules:** no em dashes in anything a person reads. No emoji in the
internal tools (`/dashboard`, `/tickets`, `/label`, `/admin/*`). The kids' app
keeps its own playful theme; the internal tools use
`src/components/admin/shell.tsx`. The app must keep working with zero env vars.
Push directly to `feat/pro-infra`, no PRs.

---

## Phase 1: the two bugs

### 1.1 A kid is a different kid on every device

**The bug as seen:** same URL, same "Demo Kid", different XP and different
homework on a laptop and a desktop.

**The cause:** there is no account. `src/lib/store.ts` generates a random id in
`localStorage` on first load. Two devices generate two ids, so they are two
different kids sharing a default display name. `/profile/[id]` renders the local
profile and ignores the `[id]` in the URL completely, which is what makes it look
like one account that is failing to sync.

The recovery code built in `0018_kid_recovery.sql` already solves the underlying
problem. Nothing surfaces it, so nobody uses it.

Three parts:

- **Make the URL mean something.** In `src/app/profile/[id]/page.tsx`, if the
  `[id]` param does not match the local profile id, do not silently show the
  local one. Offer to load that profile: "This is someone else's page. Is this
  you?" with a button that adopts it via the existing `store.adoptByCode` path
  (add an `adoptById` sibling in `src/lib/store.ts` that skips the code lookup).
- **Sync XP and progress, not just artwork.** `store.hydrateFromServer()` only
  merges artifacts and homework. `profiles` already stores `xp`,
  `region_progress`, `vocab_correct` and `letter_stats`, and `syncJoin` writes
  them. Extend the `profile_artifacts` pattern with a `profile_state(uuid)`
  SECURITY DEFINER function and merge on hydrate, taking the higher XP and the
  union of progress rather than overwriting.
- **Tell them the code exists.** A one-line prompt on `/profile` and at the end
  of a game run: "Playing on another device? Use your code." The card already
  exists in `src/components/recovery-code.tsx`.

**Verify:** set homework on device A, enter the code on device B, see the same
gallery and the same XP. Then reload A and confirm nothing was lost.

### 1.2 The feedback widget still cannot take a screenshot

Raised twice, filed, never built. It is the single most requested thing.

`src/components/feedback-button.tsx` gains paste and drag-drop. On submit,
upload to the `idea-attachments` bucket, then create a **ticket** rather than
only a `feedback_items` row, so it lands where work happens. Reuse the upload
code in `src/app/tickets/forms.tsx` (`ImageAttachment`).

**Verify:** from inside a game, drag a screenshot into the feedback box, send,
and find the ticket on `/tickets` with the image rendered on the card.

---

## Phase 2: report a question, the Duolingo way

The best small idea in the session, and everything it needs already exists.

Duolingo puts a small flag on the answer screen. One tap, a short list of what
was wrong, done. We have `content_items` ids, a `question` ticket type, and a
`problem` enum that already matches: wrong answer, bad audio, poor question,
unclear, culturally wrong, too hard, too easy.

- A `<ReportQuestion itemId={...} gameSlug={...} />` control, rendered on the
  reveal state of every game that knows its current item. Start with
  `sound-it-out`, `greetings-quiz` and `where-kz`, which already compute the id
  for telemetry via `src/lib/items.ts`.
- It files a `question` ticket with `item_id` and `problem` prefilled, so no
  typing is needed.
- Kids are anonymous, so a server route is needed rather than a server action;
  rate limit by profile id to stop a bored child filing two hundred.

This closes the loop that the labelling queue and item analytics were built for:
a real person hears bad audio, taps a flag, and it arrives as an object the
system already understands.

**Verify:** flag a question mid-game, see it on `/tickets` filtered to
"Flagged question" with the right item id, and see it appear in the labelling
queue ordered ahead of unflagged items.

---

## Phase 3: stop being boring

This is the part Diar actually cares about. Ordered by impact per unit of work.

### 3.1 Facilitator-led live rounds, the Kahoot replacement

The team pays for Kahoot Pro and renews it. This is the feature that ends that.

`/facilitator/[code]/live` already exists with a session code, a roster and
Supabase Realtime. Add a **hosted round**: the facilitator picks a game and
launches a question, the projector shows the prompt, every kid answers on their
own device, and the projector shows a live count, then the answer, then a
leaderboard.

Start with Where in Kazakhstan, because the pin drop is far more fun on a shared
screen than multiple choice: everyone's pin appears on the projector at once,
then the real location, then who was closest.

Reuse `sessions.current_region` for the launched question and the existing
Realtime channel in `src/lib/supabase/sync.ts`.

### 3.2 Base language: Russian or English

Some kids read Russian better than English, and right now every prompt is
English-only, which means half the room is doing two translations at once.

Add `baseLanguage: "en" | "ru"` to the profile, a toggle on `/play`, and a `ru`
field alongside `en` in `src/content/vocab.ts` and friends. Regenerate
`content_items` with `scripts/gen-items.mjs`; the payload already carries
whatever fields it is given.

This doubles the usable content without inventing a single new question, and it
is the accessibility fix hiding inside a feature.

### 3.3 Say it out loud

The speech game. A phrase in the base language, the mic is live, and the learner
has to say the Kazakh before the character reaches the door. Web Speech API for
recognition, falling back to "we could not hear you" rather than failing.

It is the only mode in the whole app that practises **speaking**, which is the
thing a language app is ultimately for, and it is the format that works on
Reels for a reason.

### 3.4 Kids make the questions

Zhanerke has already told the group this is coming, so it is a promise to keep
rather than an idea to consider.

A kid writes a question, it lands as `content_items` with `status = 'draft'` and
`source = 'human'`, and it enters the labelling queue for an adult to approve
before any other child sees it. The whole pipeline for this already exists.

### 3.5 Decide about Greetings Quiz

It and Sound It Out are both listen-and-pick. Either merge them into one game
with two packs, or give Greetings a distinct mechanic. Two thin games are worse
than one good one. This is a judgement call for Diar, not a task.

---

## Phase 4: smaller, still worth doing

- **Google sign-in.** Ten minutes of setup. A verified email makes the
  `invited_people` auto-approval work, which is currently blocked because the
  roster has phone numbers and no emails.
- **Add Aimi as admin.** `Aimi8gb@gmail.com` into `invited_people` with
  `intended_role = 'admin'`. Needs Supabase MCP access, which is currently
  unauthorised.
- **Tell Aimi the Maze snippet is installed.** She asked at least twice in the
  group and was never answered. It has been live since 18 July with her key.
- **Photos for more places** via the same Wikimedia Commons pass that worked for
  the six. Record licence and author in `docs/photo-credits.md`.
- **The front Ү clip is still wrong.** Both regenerated candidates were rejected.
  Needs a native speaker recording rather than another TTS attempt.
- **Aktau and Mangystau are the same pin** (S2S-52). Merge or replace one.
- **Revoke the Telegram bot token.** It was pasted into a chat and the bot is
  not being used. BotFather, `/revoke`.
- **Drop Linear.** Reasoning in `docs/session-log.md`. Leave the code dormant
  behind the missing key; do not delete it.

---

## Explicitly not doing

- **Linear as a live dependency.** One developer, and the ticket board already
  sits on the same database as the content it describes. A Linear issue can
  never carry a `content_items` id.
- **Warp as a replacement for either.** It is a terminal. Different category.
- **A native app.** All eleven games are web canvas and DOM.
- **Personalisation** before checking whether expert labels predict learner
  outcomes. Ordering by an unvalidated model is theatre.
- **More ticket types.** Bug, request, flagged question covers it.

---

## Verification, every phase

- Run it: `./node_modules/.bin/next dev -p 3100`. Not just a green build.
- `./node_modules/.bin/next build` and `./node_modules/.bin/eslint` clean. The
  warning baseline is 31; do not add to it.
- `git diff | grep '^+' | grep '—'` returns nothing.
- Deploy with `vercel deploy --prod --yes`, then check the changed route
  actually renders.
- Close the matching ticket on `/tickets` with a real decision note.
