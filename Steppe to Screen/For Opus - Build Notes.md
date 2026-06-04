# Steppe to Screen — Build Notes for Opus (games hub v2)

> Paste this whole file to Opus / Claude Code in the `s2s` repo. It's grounded in the
> current code: `src/content/games.ts`, `src/app/play/*`, `src/content/{vocab,regions,alphabet,aitys-couplets}.ts`,
> `src/lib/store.ts`, `src/components/game/game-shell.tsx`. Design mocks for everything below are in
> **Games Hub Directions v2.html** (Hero hub, Shelves hub, and four game screens). Keep the existing
> design tokens in `globals.css` (steppe `#1e4d8c`, gold `#ffd700`, warm `#faf6e9`, felt, terra, wolf) and Nunito.

## 0. Guiding principles (apply everywhere)
1. **Every game goes English → Kazakh.** The prompt is in English (or a picture); the answer/target is Kazakh in **Cyrillic**. Do not rely on Russian — many kids can't read Cyrillic Russian reliably, so the Kazakh alphabet itself is a core learning goal, not an obstacle to route around.
2. **Never show the answer on the thing you're asking them to identify.** See §3.1 — this is currently happening and must be audited across all games.
3. **Progression = the "Silk Road".** Play → clear levels → move along a map; replay anything for more points. Weekly stops unlock with an in-person code (§2).
4. Keep everything offline-first / `localStorage` as it is today; new state (codes, unlocked weeks) persists the same way.

## 1. Roster changes (`src/content/games.ts` + routes)
Update the `GAMES` array and routes to this set. New `group` field drives the Shelves layout.

| slug | New title | kk | group | Action |
|---|---|---|---|---|
| `sound-it-out` | Sound It Out | Дыбыс | Words & Letters | **NEW** (§4.1) |
| `sozdik-match` | **Word Match** (rename) | Сөз сәйкестік | Words & Letters | keep, fix §3.1 |
| `memory-match` | Memory Match | Естен қалдырма | Words & Letters | keep |
| `falling-sozder` | **Falling Words** (rename) | Құлайтын сөздер | Words & Letters | keep, fix §3.2 |
| `where-kz` | Where in Kazakhstan? | Қайда? | Places & Culture | **NEW** (§4.2) |
| `bazaar` | Steppe Bazaar | Базар | Places & Culture | **NEW** (§4.3) |
| `snow-leopard` | Snow Leopard Patrol | Қар барысы | Get Up & Move | keep |
| `jaryq-hunter` | **Flashlight Words** (rename) | Жарық | Get Up & Move | keep, fix §3.3 |
| `tanba-studio` | **Design Your Avatar** (rename) | Сурет салу | Make Your Own | keep, see §1.1 |
| `story-maker` | Story Maker | Әңгіме | Make Your Own | keep |

**Remove / comment out:**
- **`aitys` (Aitys Battle)** — the couplets in `src/content/aitys-couplets.ts` don't actually rhyme. Comment the game out of `GAMES`, leave the route file in place but unlinked, and add a `// TODO: needs real rhyming couplets before re-enabling` note. Don't delete the content file.
- **`dala-quest`** — it stops being a standalone tile and **becomes the hub's Silk Road progression layer** (§2). Keep `src/content/regions.ts`; that data now feeds both the Silk Road map and the new "Where in Kazakhstan?" game.

### 1.1 "Design Your Avatar" (was Tańba Studio)
- Reframe in copy as a **maker tool, not a scored game**: "Draw your own avatar — or import a drawing." No "tańba" jargon anywhere user-facing.
- Add an **image import** path so kids can bring in art they made elsewhere (e.g. the Canva drawings from workshop 1): accept an uploaded PNG/JPG/SVG, store it as the avatar, same persistence as the drawn version. Keep the existing draw canvas as one of two tabs: **Draw** / **Upload**.
- It should not award level/points like the others; it just sets the avatar used across the app (`src/components/avatar.tsx`, `useProfile` in `src/lib/store.ts`).

## 2. Silk Road progression + weekly unlock codes
This is the spine that ties the hub together. Mocked in v2 as both the Hero card and the slim Shelves banner.
- Add an 8-stop **journey** (reuse the 8 regions in `regions.ts` as the stops: Almaty, Astana, Aral, Charyn, Mangystau, Karaganda, Shymkent, Türkistan).
- Each stop = a **week**. A stop unlocks when the kid enters that week's **code, handed out in person at the workshop** (motivation to show up). Store `unlockedWeeks: number` (or a set of stop ids) in the profile.
- Codes: simplest workable version — a small map of `{ code: stopId }` the facilitator sets (extend `src/app/admin/content` so a facilitator can set/rotate the weekly code). Validate client-side against unlocked list; wrong code = gentle shake + "Ask your facilitator for today's code."
- Hub shows: **Week N of 8**, progress dots, a code-entry field + **Unlock** button, and **"replay any game for more points."** Locked future stops are visible but greyed (like the trail mock in v1).
- Points are **re-earnable on replay** (confirm `game_runs` already supports repeated runs — it does; just make sure the hub surfaces "replay for more").

## 3. Bug fixes / redesigns on existing games
### 3.1 "Answer printed on the card you're meant to guess" — AUDIT ALL GAMES
Several prompts show the answer they're asking for. Rule: **the side you're testing must be hidden.** Specifically check:
- **Word Match / Memory Match / Falling Words**: if the task is "pick the Kazakh word for *apple*", the option cards must show **only** the Kazakh word or the picture — never the English gloss *and* the Kazakh on the same card. Decide per-mode which side is the prompt and which is the hidden answer, and assert it in code (a quick unit check or runtime `console.assert` that prompt-text ≠ any option's revealed text).
- The vocab cards in `src/content/vocab.ts` carry both `en` and `kk` (+ image). The component is leaking both onto answer tiles. Render only the testable side.

### 3.2 Falling Words (`/play/falling-sozder`) — missing correct answer
Bug: sometimes the basket/option for the currently-falling word **isn't on screen**, so it's impossible. Fix the spawn logic so that **the correct target always exists among the active baskets** before a word is allowed to fall. Add a guard: when spawning a falling word, assert its answer is in the current basket set; if not, either add the basket or pick a different word. Add a test around the spawner.

### 3.3 Flashlight Words (`/play/jaryq-hunter`) — needs real fullscreen
The flashlight/reveal idea is good but unplayable on small screens.
- Add a prominent **"Go Fullscreen"** button using the Fullscreen API (`element.requestFullscreen()`), and design the whole game to assume a large surface (projector or fullscreen tablet).
- Light follows **mouse, touch, *and* works as a projector activity** (a kid can wave a real torch — but the in-app light tracks pointer/touch). Big radial beam, faint hidden words underneath, tap/click inside the beam to "catch" a revealed word. HUD: "Find the animals · X / N", found-words row. See the v2 mock.
- Provide an explicit **Exit fullscreen** and keep it responsive down to tablet size.

## 4. New games (specs + mocks in v2 file)
### 4.1 Sound It Out — `sound-it-out` (Words & Letters) — alphabet core
Duolingo-style listen-and-pick. Mock: big play button + three large letter cards + Check.
- Prompt: play an **audio clip** of a Kazakh letter's sound; kid picks which **letter** (Cyrillic) makes it. (Also support the inverse: show the letter, play 3 clips, pick the matching audio — alternate rounds.)
- **Prioritise the 9 letters Kazakh has that Russian doesn't:** Ә Ғ Қ Ң Ө Ұ Ү Һ І. Source the letter list from `src/content/alphabet.ts`; add per-letter audio files (see §5).
- 3 options, hearts/lives, progress bar, levels by letter group.

### 4.2 Where in Kazakhstan? — `where-kz` (Places & Culture) — "Kazakh GeoGuessr"
Mock: location photo on the left, tappable map of Kazakhstan on the right, drop-a-pin + Guess.
- Show a **photo of a real place**; kid **drops a pin on a stylized map** (or picks from named options for younger kids — make difficulty a setting). Score by correctness/closeness; reveal the place name in Kazakh + a fact afterward.
- Reuse `regions.ts` (it already has `x,y` centroids on a 1000×600 map, names, kk, and `fact`). **Add the places the team called out: Charyn, Almaty, Karaganda, Burabay, Aktau** (Burabay is new — add it; Aktau ≈ Mangystau, relabel or add).
- Photos are user-supplied: build it to accept an image per region (drop into `public/img/places/photos/` or an admin uploader). Until then, ship with the existing schematic place SVGs as placeholders.

### 4.3 Steppe Bazaar — `bazaar` (Places & Culture) — food + numbers + money
Mock: task bar + market stall of food items with teńge prices + basket total.
- Combines **food vocab + numbers + counting teńge (₸)**. Task e.g. "Buy 2 alma and 1 nan"; kid taps items, app sums the price; they confirm the total. Teaches food words (`vocab.ts` food category), quantities, and simple addition.
- Works **solo** and as a **live facilitator round** (project the task, kids race on their devices).

## 5. Assets needed (flag to the team — don't invent)
- **Audio**: recorded clips for each Kazakh letter sound (§4.1) and ideally each vocab word. Store under `public/audio/...`; wire through `src/lib/audio.ts`.
- **Photos**: real location photos for Where in Kazakhstan? and (optional) workshop photos for the hub. Build uploaders/placeholders; the team will supply real media.

## 6. Hub layout — pick one (both mocked)
- **Option A — Hero / Silk Road journey**: big "this week's stop" card with week dots + code unlock + "Play this week," reward (yurt build) + points cards, then this week's games as a grid.
- **Option B — Shelves**: slim Silk Road banner up top, then four mood shelves (Words & Letters · Places & Culture · Get Up & Move · Make Your Own) with NEW badges.
- (The design owner will choose A or B; build the shared pieces — `WeekDots`, code unlock, NEW badge, game card — so either composes from them.)

## 7. Open question for the team (not a code task)
We discussed hooking in an **AI game-builder**. If you generate standalone HTML5/JS mini-games externally, the cleanest integration is to **embed each as a sandboxed `<iframe>`** under a `/play/<slug>` route and pass score back via `postMessage` into the existing `game_runs` flow. If you want this, expose a tiny documented message contract (`{type:'game_complete', score, durationMs}`) and Opus can add the receiver + a generic `ExternalGameShell`. Confirm before building.

---
*Generated from the v2 design pass. Mocks: `Games Hub Directions v2.html`. Questions on intent → the design file's "What changed" brief.*
