# Session log

Every idea raised across this build, what happened to it, and why. Written
because a lot of it went past unread.

Status words mean exactly one thing each:

- **Done** shipped to production and verified
- **Partly** some of it shipped, the rest is named below
- **Open** filed as a ticket, not started
- **Dropped** deliberately not doing, with the reason

---

## The original Notion list

| Idea | Status | What actually happened |
|---|---|---|
| Dashboard for key insights | Done | `/dashboard`. Item difficulty, weekly activity, per-game accuracy. Two panels were cut after you called them out as counts rather than decisions. |
| Triage and feature request page | Done | `/tickets`. Started as an upvote board, became a ticket system with types, refs, reviews and edit history. |
| Upvotes, comments, attachments, inspiration links | Partly | Votes, comments and links done. **Image attachments upload but the feedback widget still cannot take them.** Open. |
| Android app | Dropped | You chose PWA now, Capacitor later. All eleven games are web canvas and DOM, so a native rewrite forks the thing that works. |
| Web app | Done | Already existed. |
| App Store app | Dropped | Same reason. Deferred until a store listing is worth $99 plus review. |
| DB fully fledged | Done | 20 migrations. Identity, content items, telemetry, tickets, labelling, recovery. |
| Games complete | Open | Six of eleven still hidden. Needs the written quality bar first. |
| Maze integration | Done | Snippet was already live with Aimi's key since 18 July. Nobody told her. Results import still Open. |
| Human labelling with reasons | Done | `/label`. Five axes, required reasons on rejection, gold checks, per-rater credit. |
| Voice mode that transcribes your thoughts | Done | Records, uploads first, then transcribes via ElevenLabs. A failed transcription never loses the recording. |
| Research questions | Done | Four in `docs/research.md`, each naming the tables that answer it, plus KazBench-Learn v0. |
| Linear integration | Partly | Code complete and gated on an API key. **Now questioned, see below.** |
| Draft published to a test link, attached to the ticket | Partly | The field and the webhook exist. Nothing auto-deploys yet. |
| AI flags what it is unsure about | Partly | Taxonomy and UI exist and render. No generator emits them yet. |
| ElevenLabs MCP for voice | Partly | Used the HTTP API instead. Two clips regenerated and approved, one still wrong. |
| Screen Studio demo | Done | `docs/demo-script.md`, four minutes. |
| Documentation everywhere | Done | 12 docs in the repo, 6 pages in Notion. |

---

## Things found by using it

| Issue | Status | What happened |
|---|---|---|
| Anon key could read every kid's profile | Done | The original migration shipped `for all using (true)` on every table. The anon key ships in the JS bundle, so anyone with dev tools could read everything. Fixed and verified with the real key. |
| Every artwork and homework upload silently failed | Done | The storage bucket had no insert policy, and both sync helpers `return` on error. Two months of uploads lost. Errors are now reported. |
| Kid work vanished on a cleared cache | Done | Nothing was ever read back from the server. Added hydration and a six-character recovery code. |
| **Work does not follow you between devices** | Open | You found this. Same URL, same "Demo Kid", different XP and homework. Explained below, it is not fixed. |
| Random circle on the journey card | Done | Decorative ring left over from a previous layout. |
| Six roles that meant two things | Done | Collapsed to pending, member, admin. Expertise became a separate descriptive field. |
| No way to decline someone | Done | `declined` is a real state, reversible, and keeps them off the queue. |
| Dashboard wore the kids' theme | Done | New admin shell. Cool grey, Inter, dense. Applied to dashboard, tickets, labelling, feedback, team. |
| Em dashes everywhere | Done | 75 removed. Two kept: Kazakh uses the dash as a copula, removing it makes the Kazakh wrong. |
| Emoji in the internal tools | Done | Gone. |
| Item analysis said "teaches nothing" at n=2 | Done | Threshold raised to 30 attempts, verdict language removed. You were right. |
| Flagged questions could not be filed without an item id | Done | Now needs an id, or a game, or a stated problem. |
| Decision form wiped fields left blank | Done | Only writes the keys actually present. |
| "Try the draft" 404'd when there was no draft | Done | Parses the URL first, otherwise says so. |
| Where in Kazakhstan was a cloud, not a map | Done | Real map, cropped to a known projection. |
| Pins in the wrong places | Done | My first attempt was still wrong: I assumed the plot frame was the graticule. Solved from the landmass instead and checked every pin visually. |
| Six places had no photo | Done | Wikimedia Commons, freely licensed, credited on the image where required. |
| Two audio clips mispronounced | Partly | Ұ and Қайырлы таң replaced with your picks. **Ү is still wrong**; neither candidate was accepted. |
| Feedback widget cannot take attachments | Open | Raised twice. Filed but not built. Fair complaint. |

---

## Ideas raised and not yet built

| Idea | Status | Note |
|---|---|---|
| Report or flag a question, Duolingo style | Open | Your best small idea. Duolingo puts a flag on the answer screen; a tap files a report against that exact question. We have the ticket type and the item ids already, so this is mostly UI. |
| Base language toggle, Russian or English | Open | Some kids read Russian better. Real accessibility feature and it doubles the content surface. |
| Facilitator-led live Where in Kazakhstan | Open | Projector shows the photo, everyone pins on their own device, closest wins. **This is the Kahoot replacement.** |
| Merge Greetings Quiz into Sound It Out | Open | Both are listen-and-pick. Worth deciding rather than leaving two thin games. |
| Speech game, say it right to get through | Open | Instagram Reels format. The only mode that would practise speaking. |
| Kids create their own games or questions | Open | Zhanerke has already told the group this is coming. |
| Agent that fetches photos for more places | Open | Now proven: the six Commons photos took one pass. |
| Engine that triages reported tickets | Open | Your brother's project. Good scope: real data, clear success measure, and it does not block anything else. |
| Feedback goes to AI review on one button | Open | Human presses it, so kids cannot spend the AI budget. |
| Obsidian ticket mirror | Open | LiveSync is installed on the real vault, so this can be near-instant. |
| Level-based permissions | Open | Grant no higher than your own level. |
| Educator homework review | Open | Educators mark homework complete. |
| Google sign-in | Open | Recommended. Verified email means the roster auto-approval finally works. |
| shadcn component registry | Open | The actual fix for "everything looks the same". |
| PWA offline caching | Open | The gym wifi problem. |
| Dataset export, kappa agreement, credits page, Sentry | Open | Later. |

---

## The device bug, explained

You saw the same URL and the same "Demo Kid" show different XP and homework on
two machines. That is not a sync failure. There is no account.

A kid's identity is a random id generated in `localStorage` the first time the
app loads. Two devices generate two different ids, so they are two different
kids who happen to share a default display name. `/profile/<id>` shows the local
profile and ignores the id in the URL entirely, which is what makes it look like
one account.

The recovery code fixes exactly this, and you did not use it because nothing
told you to. So the real bug is that the app presents two separate profiles as
if they were one. The fix has three parts, in the plan.

---

## Linear, and whether you need it

You asked. Honest answer: **no, not for this.**

Linear is worth it when several developers need to coordinate work across
sprints. You have one developer and a board that already does types, refs,
priorities, assignees, reviews and a full edit history, sitting on the same
database as the content it is about. A flagged question on `/tickets` carries
the `content_items` id and lines up with the labelling queue and the analytics.
A Linear issue never will.

Keeping Linear means two places to look and a sync to maintain. The integration
is already written and costs nothing to leave dormant behind a missing key, so
nothing is lost by simply not setting `LINEAR_API_KEY`.

**Warp is not the same category.** It is a terminal, useful for running agents
locally, but it is not a ticket system and does not replace either.

Recommendation: drop Linear, keep the code dormant, revisit only if a second
developer joins.

---

## 2026-08-03 — Say & Shift, built and playtested live

New game, plus a real playtest-and-fix loop on it, plus deploy hardening.
Everything below shipped to `feat/pro-infra` and was deployed to
`s2s-ten.vercel.app` the same session; see commit history for exact diffs.

| Area | Status | What actually happened |
|---|---|---|
| Say & Shift (new game) | Done | Mic-gated "hole in the wall" runner — say the Kazakh word out loud, no button. Continuous overlapping-window listening (a fixed chunk boundary was clipping words), word-spotting match against the target only (never distractors, so overheard chatter can't cost a life), tap fallback after a timeout/offline/denied mic. |
| Band puppet character system | Done | Kid's drawing/photo sliced into head/torso/legs bands, animated procedurally. Shared between Say & Shift and the avatar/game-builder flows. |
| 2.5D day/night runner visuals | Done | Six sky palettes across the run, parallax hills/ground, hand-drawn sun-with-rays/crescent-moon SVG (was a flat CSS gradient circle — called out as generic, replaced), horse silhouette SVG (was an emoji, also called out), drifting clouds. Explicit Auto/Day/Night control added, plus the stage now respects a custom background photo instead of painting over it. |
| Mic accuracy | Partly | Two rounds of real-kid playtesting pulled the confidence threshold in opposite directions (0.62/0.15 too strict → 0.48/0.08 accepted almost anything → settled at 0.58/0.14). **Never validated against a real recording batch** — the original plan's Step 0 spike didn't run, no mic access to do it outside a live session. Revisit with real data before trusting the numbers. |
| Live multi-table race | Done, gated off | Facilitator projector view, one lane per table, broadcasts each table's live wall progress. Built on the existing round-broadcast pattern, no new infra. Gated behind `NEXT_PUBLIC_ONLINE_FEATURES` (unset in prod) — untested with real multiple devices in a room. |
| Facilitator session lifecycle | Done | "End session" was fake (navigated away, session stayed "live" forever) — now actually ends it. Persistent "return to live session" banner so navigating away doesn't lose it. |
| Deploy gating | Done | `/facilitator`, `/join`, live race, and the `/play/create` game builder all show "Coming soon" in the public deploy — none were ready for public traffic. Steppe Sprint hidden from the hub (code intact); Say & Shift is the new featured game. |
| Vocab expansion | Partly, flagged | +20 words across 3 new categories (weather/school/nature), marked `aiDrafted: true` in `src/content/vocab.ts` — **not checked by a native speaker.** SVG placeholders generated; TTS audio not generated (ElevenLabs plan returned 402 on the library voice via API — needs a plan upgrade, or a different voice). |
| No-gradient visual pass | Done | Every gradient CTA pill (Button component, feedback button, home hero, top-nav wordmark) replaced with solid color + hard offset shadow + `rounded-2xl` — called out repeatedly as generic "AI slop." |
| Profile controls | Done | Reset-profile (wipes local progress, confirm-gated), per-artifact delete (gallery + homework), clearer artifact labels. |
| Drawing tools | Done | Real eraser (erases only the stroke, `destination-out` on transparent canvases) — the existing "Eraser" button was actually a mislabeled clear-all. Drag-and-drop + clipboard-paste image input added alongside the file picker, in the avatar studio and Say & Shift's character step. |
| Local shadcn/Base UI experiment | Recovered | A Cursor-side `shadcn init` (Base UI style) silently overwrote `utils.ts` (lost `shuffle`/`sample`/`makeSessionCode`), `Button.tsx` (different variant names than the ~50 call sites using `gold`/`primary`/`danger`), and `globals.css` (`@import "shadcn/tailwind.css"` — not a real path). Broke the production build. Restored; `components.json`'s custom registries kept since those are additive, not destructive. |
| Duolingo-style leveling/roadmap, "tons more vocab" | Open | Requested, scoped, not built this session — see the plan below. The existing `JOURNEY`/`REGIONS` weekly-unlock system is already a path-style progression, just not presented as one. |

**Known gaps, next session:**
- Mic thresholds are still a guess, not data — the real fix is logging enough
  real attempts (already flowing into `learning_events` via `logAnswer`) and
  tuning `CONFIDENCE_THRESHOLD`/`MARGIN_THRESHOLD` in `src/lib/speech-match.ts`
  against them.
- Live race has zero real-device testing — needs two actual tables playing
  at once against one facilitator screen.
- The 20 AI-drafted vocab words need a native-speaker pass before a real
  workshop uses the weather/school/nature categories.
- Per-game difficulty tiers, a visible skill-tree hub, and a real vocab
  expansion beyond the 20-word draft are scoped but not started.

---

## 2026-08-04 — English-only, Say & Shift in Make Your Own, real levels, instructor vocab packs

| Area | Status | What actually happened |
|---|---|---|
| EN/RU toggle removed | Done | Every kid in this program is schooled in English and the Russian gloss was never translation-checked. Deleted the toggle UI on `/play`; `Profile.baseLanguage`, `baseText()`, and the ~10 call sites are untouched (they just never see anything but `"en"` now that nothing can set it to `"ru"`). |
| Say & Shift moved into "Make Your Own" | Done | It already has a character-drawing step like the avatar/story makers — moved its `games.ts` group and gave it the first Maker-lab card, ahead of avatar/story. |
| Real levels for Say & Shift | Done | Per-category tiers (`src/lib/vocab-levels.ts`) derived from existing mastery counts (`vocabCorrect`), no new profile field. Level 1 starts with numbers/family/greetings; each level widens the category set and the wall count (4 → 7). Falling Words and Spotlight Panic keep their own separate session-local leveling, untouched. |
| Instructor vocab packs | Done | `/admin/vocab` (admin-only) writes to the existing `content_items` table (`source: "human"`, `status: "live"`) via a server action, live immediately, no deploy. Added a `content_items` RLS policy for anon read of live rows — the original design would have queried it straight from the browser, but `content_items` only had a team-only read policy, so an anonymous kid's client would've silently gotten zero rows. `useVocab()` merges instructor words into Say & Shift, Falling Words, and Spotlight Panic. |

**Known gaps, next session:**
- The new `content_items` public-read policy needs to actually run against a
  live Supabase instance to confirm the anon key reads it as expected — not
  verified end-to-end this session (no live DB access).
- Instructor-added categories aren't supported yet — the admin form's
  category field is a fixed `<select>` from the existing `VocabCategory`
  list, so a genuinely new category wouldn't get a pack tile in Falling
  Words/Spotlight Panic without also updating `VOCAB_CATEGORY_META`.
- Rolling `useVocab()` out to the remaining vocab-driven games is future
  work, not this pass.

---

## 2026-08-03 — Live playtest fixes: Learn, Falling Words, Nomad Run, Spotlight Rush

Renamed from Say & Shift → Nomad Run and Spotlight Panic → Spotlight Rush.
Merged Sound It Out + Greetings Quiz into one "Learn" game that rotates
letter/greeting/general-vocab rounds. Rest of this entry is bug fixes found
by playtesting the deployed build directly.

| Area | Status | What actually happened |
|---|---|---|
| Falling Words: correct tap sometimes not registering | Done | Real race condition: a tap landing at nearly the same instant a word reached bottom could lose to the rAF timeout, which swapped the target word before the click handler ran — a genuinely-in-time tap got checked against the wrong word. Fixed with a 220ms grace hold at the bottom before the miss resolves, so an in-flight tap still lands on the word it was for. Verified by artificially widening the grace window and confirming a deliberately late tap now counts. |
| localStorage quota silently dropping saves | Done | `persist()` never caught `localStorage.setItem` failing (QuotaExceededError once a profile's `artifacts` — base64 photos — grew large enough). The in-memory change looked like it worked for the rest of that session, then was just gone next visit — this is very likely what looked like "picture hints don't persist." Now retries after trimming `artifacts` to the most recent 20, and shows a toast if a save genuinely can't be saved instead of failing silently. Also capped `artifacts` at 60 going forward so this doesn't recur as easily. |
| Nomad Run: stray image flash on load | Done | `BandPuppet` slices a runner image into head/torso/legs bands asynchronously (image decode + full pixel-alpha scan) and had zero caching, so every single mount — including revisiting a game you'd already set a runner in — showed the default `<Avatar/>` placeholder for a beat before the real art swapped in. Cached sliced bands by source data URL; a given runner image only ever pays that cost once. |
| Falling Words: play field too small | Done | Field height/fall-speed constants scaled up together (~1.34×, same ratio as the original 380px/62px-per-second) so the card isn't mostly empty white space below a small game box, without changing the actual fall duration or difficulty curve. |
| Generic "Set/Change background" button | Done | Was on every `GameShell` screen and quietly changed the whole page chrome (not just the intended game window) to match — confusing and not asked for anywhere but Nomad Run. Made opt-in per screen; only Nomad Run's Sky panel enables it now, and it only affects that game's own play field, not the page around it. |
| Falling Words: mnemonic picture hints | Done | Kid attaches a photo to a specific hard word (a "before" panel on the pick screen, not while a word is actively falling — tried in-game first, reverted per direct feedback) and it becomes that word's background whenever it falls again. |

**Known gaps, next session:**
- Small vocab packs (e.g. Family, 10 words) hit their natural ceiling fast —
  playtest feedback was "it feels like it ends before I'm done." Worth
  either widening the per-pack pool or letting a finished pack roll into an
  infinite/endless continuation (same shape as Nomad Run's post-calibration
  infinite mode) instead of stopping. Not built this session — flagged for
  next pass.

---

## 2026-08-16 — What to steal, and what not to build

Product pass after looking at Duolingo-class apps, classroom live games, and
similar kids products. Bias: make the games we already have stickier. Do not
add a pile of new modes.

### Already exists (do not rebuild)

| Thing | Where |
|---|---|
| Hearts / lives | Learn, Nomad Run, Sound It Out, Jaryq Hunter |
| Practice words you missed | Learn, "Practice N you missed before" (closed #14) |
| One-pass question check | `/verify` (closed #5). Approve or send back with a comment. Split across the team. |
| Five-axis labelling | `/label` |
| Session join codes + attendance rows | `sessions` + `attendance` tables. What is missing is a reason to enter the code (points, prizes, extras). |
| Weekly journey rail | `JOURNEY` / `REGIONS` on `/play`. A path exists. It does not look or feel like one. |
| Streak number in the nav | `streakWeeks` is stored and shown. Nothing in the app ever increments it. |

### Dashboard and labelling, current facts

Queried `team_members`, `labels`, and `question_verifications` on 2026-08-16:

- **One real team account:** Diar (`admin`). One declined test inbox. Nobody else has signed in.
- **Zero labels. Zero verifications.** `/label` and `/verify` are built and empty.
- Dashboard does not show "how much of the checklist is done".

The pronunciation problem (ElevenLabs clips that do not sound like Kazakh) is
not a missing page. It is that the team has not gone through the list once.
Native-speaker comments on kinship and register (әже vs апа, аға used for
older brother and for uncle, the in-law terms) belong in that pass.

### Recorded from the in-person workshop

Where in Kazakhstan on a projector, screen-shared. Kids who knew the place
raised a hand, ran up, and put the pin on the map in front of everyone.

That physical run-to-the-front is more interactive than sitting and tapping
on a phone. Keep it as a real option. The in-app live round (facilitator
launches, kids pin on their own device) still exists and is the Kahoot
replacement for Zoom. The question for the team is whether the in-person
version should stay analogue on purpose, or whether the projector should
still be the pin surface while kids stay in their seats.

### Latin vs Cyrillic (Canadian school)

A lot of these kids go to school in Canada. Latin may be the script they can
actually read. Cyrillic is not a given, even if Kazakh is spoken at home.

Concrete case: Al, seven or eight, lived here pretty much his whole life.
Unknown whether he can read Cyrillic. Starting him on the Kazakh alphabet
in Cyrillic is the trivial-for-the-wrong-reason version of #23.

Vocab already has a `latin` field; Learn shows it after reveal, which is
too late if they cannot read the prompt. Try a Latin line under the word
with Al and a couple of peers before making it the default. Filed as #55.
Not Qazaq Latin as an orthography project. A reading scaffold.

### Parent dashboard: not now

Do not build a parents dashboard. Nobody has asked, and there are not
enough users for it to be worth the surface. #20 (admin seeing kid
progress) is the team classroom view, not a parent product.

### Visible map progression (#42)

A path you can see: where you have been, where you are, what is locked.
Landmarks and a reward at each stop. `JOURNEY` / `REGIONS` already has
eight places. The hub is dots. It should look like a game map.

Ship the simple path first, using photos we already have. Terrain can
change per stop (Mangystau dry, Almaty mountains, Aral water). Placement
(#23) drops a decent reader onto the right stop.

Cinematic zoom-into-Kazakhstan is easy to make ugly. If it happens later:
`motion` (`motion/react`) with `useScroll` / `useTransform`, real photos,
motion-primitives from #17. No generated landscapes, no 3D globe.

### Workshop-friendly streaks (#43)

Count workshop weeks, not calendar days. Soft landing: freeze, or a short
practice-to-keep pack, so missing a Saturday does not wipe the kid.
Showing up with the session code should count. Hearts already exist inside
games. This is not a second lives economy.

### League and table competition (#44)

Weekly, reset on workshop day. Table totals rather than only kid-vs-kid.
Labelling / verify points for the team so adults have a reason to clear
the checklist. Not on the kids' hub.

### Table vs table (#46)

Workshop tables (and Zoom breakouts) sharing a score on games we already
have. Live multi-table race exists and is gated. Try that in a room before
building another mode.

### Workshop attendance rewards (#47)

Session codes and `attendance` rows already exist. Time-box the code to
the workshop, then points / a prize ticket / streak keep / a limited
character for showing up. Entering the code has to stay easier than Maze.

### Remix ladder (#48)

Kids change words, art, and eventually rules, not only skins. `/play/create`
is a reskin, and a custom background collapses the five-landmark journey.
Zhanerke already told the group this is coming. See
`docs/student-designed-games.md`. Do not turn the app into Roblox.

### Roblox / Minecraft character in Nomad Run (#49)

Import their existing avatar as the runner. Nomad Run already accepts a
drawing or upload. Start with a guided crop of a screenshot. No Roblox
account linking. Teaching "what an API is" is a bonus, not the product.
