# Student-Designed Games — research, options, recommendation

**Date:** 2026-08-02
**Goal:** Every kid leaves a workshop with a game that is recognisably *theirs* — not a reskin of ours.
**Status:** decision document. Section 6 is the recommendation; section 9 is what needs a call from Janirka.

---

## 1. Where we actually are today

`/play/create` already exists (`src/app/play/create/page.tsx`) as a 4-step wizard:

| Step | What the kid controls | Stored as |
|---|---|---|
| Name | Free-text title, 40 chars | `CustomGame.title` |
| Words | Toggle vocab category packs → up to 24 words | `CustomGame.vocabSlugs` |
| World | Background: our template / photo upload / in-app finger-draw / pick from their gallery | `backgroundTemplateId` \| `backgroundDataUrl` \| `backgroundArtifactId` |
| Launch | Preview + create | → `/play/create/[id]` renders `<SteppeSprint>` |

Two things worth knowing before we plan anything:

**(a) The kid's drawn avatar is already the runner.** `SteppeSprint` renders `<Avatar />` as the player sprite (`src/components/game/steppe-sprint.tsx:458`), and `Avatar` reads `profile.avatarArtifactId`. So a drawing made in Tanba Studio already runs down the track. But `tanba-studio` and `story-maker` are both `hidden: true` in `src/content/games.ts:65-66`, so no kid can currently reach them. **We are shipping less authorship than we already built.**

**(b) Customising currently makes the game worse.** The default game is a 5-landmark journey — Charyn → Almaty → Astana → Mangystau → Turkistan (`DISCOVERY_ROUTE`, line 60). The moment a kid supplies a background, `customRoute()` (line 142) replaces all five stops with *the same image repeated five times*, and renames the stops to "Start / Word gate 1 / Halfway / Word gate 3 / Finish". So the kid's own game loses the sense of travel that makes ours feel good. That is a bug in the concept, not just the code.

What is hardcoded and therefore *not* authorable today:

- `TRACK_EVENTS` — 20 fixed star/rock positions (line 68)
- `GATES = [20, 40, 60, 80]` — always exactly 4 questions (line 55)
- 3 lanes, `energy = 3`, `PACE_MS` (calm 190ms / quick 125ms)
- `WORD_SYMBOLS` — a hand-maintained emoji per word (line 91). Only ~27 words have one; everything else falls back to a category emoji or `◆`.
- Question wording ("Choose the Kazakh word for…"), distractor choice (`buildChoices`, line 127)

---

## 2. The authorship ladder

The useful frame is not "customisable vs not". It is *how deep* the change goes. Rungs, cheapest first:

1. **Surface skinning** — colours, background, avatar
2. **Scene assembly** — place objects, pick a setting
3. **Prompt selection** — choose from approved word banks
4. **Prompt editing** — write/record the actual questions
5. **Rule tuning** — lives, timing, win condition
6. **Level making** — place the forks, hazards, rewards
7. **Story building** — branching scenes, intro/ending
8. **System design** — invent the loop itself

**We are at 1 and 3.** That is exactly why it reads as "just a background". A kid can tell the difference between choosing a wallpaper and deciding where the rocks go.

The cheapest genuine jump is to **6 and 4** — level making and prompt authoring. Those are what make a kid say *"play mine, it's hard"*, which is the sentence we are actually trying to produce.

---

## 3. Precedent — what has worked elsewhere

**Draw Your Game** (mobile, millions of installs) is the strongest single reference for our situation. The kid draws a level *on paper* with four marker colours, photographs it, and ~10 seconds later plays it. The colour is the semantics:

- black → solid ground
- blue → bouncy / pushable
- green → walkable but destructible
- red → kills you

Why this matters for us: creation happens **off-screen, on paper, with markers** — which is exactly the constraint of a workshop room where devices are shared and wifi is bad. The photo is not decoration; it *is* the level geometry. ([draw-your-game.com](https://www.draw-your-game.com/), [Google Play](https://play.google.com/store/apps/details?id=com.korrisoft.draw.your.game&hl=en))

**Super Mario Maker vs LittleBigPlanet** is the constraint lesson. LBP shipped far more powerful logic tools and produced millions of levels that were "barely playable"; Mario Maker's deliberately tiny, stylus-driven palette got vastly broader participation. Educators use Mario Maker level design as a real design-thinking curriculum. Takeaway: **give kids five verbs, not fifty.** ([Game Developer](https://www.gamedeveloper.com/design/lessons-of-game-design-learned-from-super-mario-maker), [Pinnguaq lesson plan](https://pinnguaq.com/learn/mario-maker-level-design-basics/), [Playful Work and Laborious Play in Super Mario Maker](https://www.researchgate.net/publication/345202429_Playful_Work_and_Laborious_Play_in_Super_Mario_Maker))

**Gimkit / Blooket** already do the language-specific version of rung 4: teachers *and students* author questions, and Gimkit lets you **record your own voice** as the prompt to train listening. Students writing their own questions ("ask about shirt sizes") is a documented classroom pattern, not a hypothesis. ([FLTMAG on Gimkit](https://fltmag.com/gimkit-games/), [FLTMAG on Blooket](https://fltmag.com/blooket-game-on/))

**Scratch / ScratchJr / Seesaw** — ages 5–7 can author interactive stories with drawing + recorded voice and no coding. The recognised pattern is draw → import → record → publish, and importing your own image instead of using the paint editor is a first-class path. ([Scratch sprites](https://www.vedantu.com/coding-for-kids/scratch-sprites), [Seesaw](https://k12technology.weebly.com/seesaw.html))

**UGC ownership research** — the motivating mechanism is *visible reuse*: recognition and seeing your content featured is what converts a player into a producer. Also the warning: children on UGC platforms meet design-mediated risks, so a facilitator approval gate is mandatory before anything crosses between kids. ([IDC 2025, Dangerous Playgrounds](https://dl.acm.org/doi/full/10.1145/3713043.3728858), [Keywords Studios on UGC](https://www.keywordsstudios.com/en/about-us/news-events/news/what-user-generated-content-ugc-is-and-why-it-matters-in-video-gaming/))

---

## 4. Full idea list

Rung = authorship depth from §2. Cost = rough build effort.

| # | Idea | Rung | Cost | Note |
|---|---|---|---|---|
| 1 | **Paper level scan** — 4 marker colours photographed become the track | 6 | High | The showstopper. Off-screen creation. |
| 2 | **Character cast** — kid draws hero + collectible + obstacle, all three appear | 1–2 | **Low** | Replaces `★`/`🪨`/emoji with their art |
| 3 | **Track editor** — drag stars/rocks/gates onto a 3-lane strip | 6 | Med | Replaces hardcoded `TRACK_EVENTS` |
| 4 | **Word gates in their own voice** — kid picks the 4 words and records them | 4 | Med | Highest language value |
| 5 | **Boss at the finish** — kid draws a villain, gets a final encounter | 2 | Low-Med | Strong emotional payoff |
| 6 | **Class gallery + play code** — classmates play each other's levels | — | Med | The ownership multiplier |
| 7 | **Printable game card** — QR + their art + high score, on paper | — | Low | The physical take-home |
| 8 | **Figma / Canva import** — design characters externally, drop in PNG | 1–2 | **Very low** | Upload path already exists |
| 9 | **Route stickers** — place their drawings as scenery along the trail | 2 | Low | Fixes the `customRoute()` regression |
| 10 | **Rule tuning** — kid sets lives, pace, gate count | 5 | **Very low** | Values already exist as constants |
| 11 | **Intro / victory cards** — kid draws *why* the hero runs, and the ending | 7 | Low-Med | Reuses `story-maker` |
| 12 | **Recorded hype lines** — their voice on correct answers | 4 | Low | "Жарайсың!" in their own voice |
| 13 | **Class mega-route** — each kid contributes one gate, played on projector | 6 | Med | Best live-workshop moment |
| 14 | **Own-word packs** — their pet's name, their village, drawn + recorded | 4 | Med | Feeds every other game |
| 15 | **Difficulty by hand** — draw a harder path, get a harder rating | 5–6 | — | Variant of 1 |
| 16 | **AI asset cleanup** (Higgsfield) | — | — | Backlogged per your call |

---

## 5. Five strong candidates

Each candidate deliberately absorbs several rows above, so these are five *packages*, not five features.

---

### A. Paper Level Scan — "your drawing IS the track"

Absorbs 1, 15.

**What the kid does.** Gets an A4 sheet pre-printed with three lane columns and a start/finish marker. Four markers on the table. They draw: black = wall, red = rock, yellow = star, blue = word gate. Photograph it in the app. Ten seconds later they are running down a track that is literally their sheet of paper.

**What we build.** Extend `resizeImageFile` (`src/lib/client-image.ts`) into a quantiser: downscale to a coarse grid (3 lanes × ~40 distance rows), classify each cell by nearest palette colour in HSV with a saturation floor so pencil grey and paper cream both read as empty, emit a `TrackEvent[]`. The printed sheet carries corner registration marks so we can do a cheap perspective correction. Feeds straight into the existing `TRACK_EVENTS` shape — the game engine barely changes.

**Ownership.** Highest of anything here. It is their handwriting, their smudges, their crossings-out. Nothing else on this list produces "that's *mine*" as fast.

**Why it fits our workshops specifically.** Creation needs zero devices and zero wifi. Thirty kids can be drawing simultaneously with one shared tablet for scanning. Paper survives a bad connection; a web builder does not.

**Risks.** Photo lighting and perspective are the whole ballgame — this needs real testing in the actual room, under the actual lights. Marker colours must be bought and controlled. Mitigation: ship a "fix it" screen showing the detected grid as coloured blocks over their photo, with tap-to-correct on any cell. That screen also doubles as a decent fallback if detection is mediocre.

**Cost.** High. Call it the two-workshop project, not the next-workshop project.

---

### B. Character Cast — "my eagle, my rocks"

Absorbs 2, 5, 8, 9.

**What the kid does.** Draws (or uploads from Figma/Canva) three or four things instead of one background: **the hero**, **the treasure**, **the hazard**, and optionally **the boss**. Every one of them shows up in play. The star they collect is their drawing. The rock they dodge is their drawing.

**What we build.** This is mostly plumbing we already own. Add artifact kinds `hero | collectible | hazard | boss` alongside the existing `tanba | canva | story | background | homework` (`src/lib/store.ts:30`), extend `CustomGame` with the four ids, and swap the literal `★` / `🪨` at `steppe-sprint.tsx:445` for their images. `<Avatar>` already handles the hero. **Unhide `tanba-studio`** — the drawing tool exists and is switched off.

Also fix the regression here: instead of `customRoute()` repeating one image five times, let their drawings ride *over* the five real landmarks, so their game keeps the sense of travel and gains their cast.

**Ownership.** Rung 1–2 on paper, but it punches far above its rung because the art is *load-bearing* — you interact with it every three seconds, rather than looking past it.

**Reuse.** This is the big one: a hazard drawing works as a ghost in Spotlight Panic, a basket in Falling Words, a card back in Memory Match. One workshop's drawing feeds the whole catalogue.

**Cost.** Low. A day, maybe two.

---

### C. Track Editor — the Mario Maker rung

Absorbs 3, 10.

**What the kid does.** A 3-lane × 40-cell grid on screen. Five stamps: star, rock, gate, empty, and "move the finish line". Tap to place. Hit play, run their own level, come back and make it meaner. Plus three sliders — lives, pace, number of word gates.

**What we build.** Lift `TRACK_EVENTS` and `GATES` out of the component into `CustomGame` as data, then a touch-friendly grid editor. The Mario Maker lesson applies hard: **five stamps, not fifty**, and instant play-test — the tight make→play→revise loop is where the design thinking actually happens, and it is what turns this from a form into a game.

**Ownership.** Genuine rung 6. This is the first candidate where a kid can build something *difficult on purpose*, which is the main thing kids want to do to their friends. It also directly answers the "I just guessed everything and finished" complaint from before — a kid-authored level has a kid-authored difficulty.

**Risks.** Empty-canvas freeze is real. Ship every new level pre-populated with our default 20 events, so the kid is always *editing*, never staring at nothing. Also needs a guard against unplayable levels (rock wall across all three lanes).

**Cost.** Medium.

---

### D. Their Words, Their Voice — the language payload

Absorbs 4, 12, 14.

**What the kid does.** Picks the exact four words for their four gates instead of accepting a category. Then records themselves saying each one. Their voice becomes the prompt other kids hear. Later: add words from their own life — their dog, their village, their grandmother's food — as a drawing plus a recording, which becomes a vocab pack usable in *every* game.

**What we build.** Word-picker UI (`VOCAB` filtered, tap 4). `MediaRecorder` for audio, stored as an artifact. ElevenLabs (`src/lib/elevenlabs.ts`, already wired) stays the fallback and the "correct pronunciation" reference — kid's voice as prompt, native/TTS audio as the answer reveal, which sidesteps the risk of teaching each other bad pronunciation.

**Ownership.** Rung 4, and by far the highest *pedagogical* value on this list — the kid has to produce Kazakh, not just recognise it. Gimkit's own-voice recording is exactly this pattern and is well-established in language classrooms.

**Risks.** Needs the review queue (see §7) before any recording reaches another kid. Mic permissions and room noise are practical annoyances. A kid recording a word wrong and their friends learning it wrong is the real hazard — hence the TTS answer-reveal above.

**Cost.** Medium.

---

### E. Class Gallery + Take-Home Card — the part that makes it matter

Absorbs 6, 7, 11, 13.

**What the kid does.** Publishes their finished game and gets a short code. Their game appears on the projector wall. Classmates play it and their names land on *the kid's* leaderboard. They walk out with a printed card: their hero drawing, their game name, the code, a QR, and a space for a high score to be filled in by hand.

**What we build.** `customGames` currently live in local storage only, capped at 12 (`src/lib/store.ts:295`). Publishing means a Supabase table plus a facilitator approve step, a `/play/g/[code]` route, and a print stylesheet.

**Ownership.** No new authorship rung at all — and it may still be the highest-leverage item here. The UGC research is consistent that *visible reuse and recognition* is the mechanism that flips a kid from player to producer. A game nobody else plays is homework. A game your friend loses at is yours. And the printed card is the answer to "something they can take" — it survives the tablet going back in the box, and it goes home to a parent.

**Also.** The class mega-route (each kid contributes one gate, projector plays the combined run) is the best live moment on this whole list and is nearly free once publishing exists.

**Cost.** Low-medium, mostly Supabase and a print stylesheet. Blocked on the same Supabase step already noted as pending in project memory.

---

## 6. Recommendation

**Next workshop: B + E.**

B (Character Cast) is a day or two, mostly unhiding and rewiring things we already built, and it converts the kid's art from wallpaper into the objects they touch every three seconds. E (Gallery + printed card) costs little and supplies the two things B alone cannot: their friends playing their thing, and something physical to take home. Together they answer your actual brief — *"a bit their own"* and *"something they receive"* — without a single risky new subsystem.

Also in that same pass, three cheap wins that shouldn't wait:

- **Unhide `tanba-studio`** — the drawing tool is finished and switched off.
- **Kill the `customRoute()` regression** so a custom game keeps the five-landmark journey.
- **Ship rule tuning** (idea 10) — lives / pace / gate count are already constants; exposing them is an afternoon and it buys a whole authorship rung.

**Workshop after: C (Track Editor).** This is the one that earns the phrase "designed by a student", and it fixes the guessability complaint at the same time. Build it after B, because B's assets make C's grid worth looking at.

**Prototype in parallel: A (Paper Level Scan).** Highest ceiling, highest risk, and the risk is entirely physical — lighting, markers, camera angle. That can be tested with a phone and four markers this week, before any real code. If it survives contact with the actual room, it becomes the signature mechanic and nothing else on this list compares. Test it before committing to it.

**D (Their Words, Their Voice)** is the most *educationally* valuable candidate and should not be dropped — but it depends on the review queue, so it lands after E establishes publishing and moderation.

Sequence: **B + E + cheap wins → C → A (if the paper test passes) → D**

---

## 7. Cross-cutting considerations

**Storage will break before the features do.** Artifacts are stored as base64 data URLs in local storage (`src/lib/store.ts:213`). A 1600px WebP data URL runs 200–400 KB; local storage caps around 5 MB. Candidate B alone takes a kid from one drawing to four. Before shipping B: push originals to Supabase Storage, keep only small thumbnails locally. This is a prerequisite, not a follow-up.

**Moderation is mandatory, not optional.** The moment one kid's drawing or voice reaches another kid, we need a gate: kid drafts → facilitator approves → published. The IDC research on children's UGC platforms is blunt about design-mediated risk. This must exist before E ships, and it is the reason D comes after E.

**Local-first, always.** Workshop wifi is unreliable. Creation must complete fully offline and sync afterwards — which is how the store already behaves, so protect that property rather than adding it later.

**Budget 15 minutes of workshop time for creation, not 45.** Every candidate needs a "good enough in 5 minutes" path and a "keep polishing" path. B is naturally safe here; C needs the pre-populated-level trick to be.

**Never gate progress on drawing ability.** Some kids will hate their own drawing. Template fallbacks stay available at every step, and the templates must look good enough that choosing one isn't a visible defeat.

**Devices are the binding constraint, and paper is the workaround.** This is the strongest structural argument for A — thirty kids can create simultaneously with one tablet doing the scanning.

**One more thing about `WORD_SYMBOLS`.** The emoji map at `steppe-sprint.tsx:91` covers ~27 words and silently degrades to `◆` for everything else. Any kid whose chosen words fall outside that list gets a game full of grey diamonds. Candidate B fixes this properly — their drawing beats an emoji anyway — but if we ship word-picking (D) before B, this becomes visible fast.

---

## 8. Explicitly not now

- Fully open sandbox / free-form world building — LittleBigPlanet's lesson
- Free-text chat between kids
- Deep branching narrative authoring
- Leaderboard-first competitive framing (leaderboards on *your own* level are fine; a global ranking is not)
- Higgsfield / AI asset generation — backlogged per your call; revisit when the credit-card question is settled

---

## 9. Open questions for Janirka

1. **Which candidate for the next workshop?** Recommendation is B + E. Cheapest path to "designed by a student" that a parent can actually see.
2. **Do we buy markers?** A needs four controlled colours and a printed sheet per kid. Small money, but it must be decided before the paper test is worth running.
3. **Who approves kid content, and how fast?** E and D both block on a human in the loop. If approval takes longer than one workshop, the "your friend played mine" loop breaks and E loses most of its value.
4. **Consent for kid drawings and voice crossing between kids.** Parent-facing wording needed before anything publishes. Currently we have no consent flow at all.
5. **Do published games belong to the kid across workshops?** i.e. does a code from workshop 3 still work at workshop 8? This decides whether we need real player accounts here or just codes.

---

## Sources

- [Draw Your Game — official](https://www.draw-your-game.com/) · [Google Play listing](https://play.google.com/store/apps/details?id=com.korrisoft.draw.your.game&hl=en)
- [Lessons of Game Design learned from Super Mario Maker — Game Developer](https://www.gamedeveloper.com/design/lessons-of-game-design-learned-from-super-mario-maker)
- [Mario Maker Level Design Basics — Pinnguaq](https://pinnguaq.com/learn/mario-maker-level-design-basics/)
- [Playful Work and Laborious Play in Super Mario Maker](https://www.researchgate.net/publication/345202429_Playful_Work_and_Laborious_Play_in_Super_Mario_Maker)
- [Gimkit for Interpretive Assessment and Student Collaboration — FLTMAG](https://fltmag.com/gimkit-games/) · [Blooket: Game on, Students! — FLTMAG](https://fltmag.com/blooket-game-on/)
- [Dangerous Playgrounds: Child Players' Encounters with Design-Mediated Risks on UGC Platforms — IDC 2025](https://dl.acm.org/doi/full/10.1145/3713043.3728858)
- [What UGC Is and Why It Matters in Video Gaming — Keywords Studios](https://www.keywordsstudios.com/en/about-us/news-events/news/what-user-generated-content-ugc-is-and-why-it-matters-in-video-gaming/)
- [Scratch Sprites — coding for kids](https://www.vedantu.com/coding-for-kids/scratch-sprites) · [Seesaw](https://k12technology.weebly.com/seesaw.html)
- [Tiles and tilemaps overview — MDN](https://developer.mozilla.org/en-US/docs/Games/Techniques/Tilemaps)
- Prior internal research: `docs/perplexity-research.md`
