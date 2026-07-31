# Roadmap

## Shipped

**Foundation** — team accounts (magic link, roles, first-user-becomes-admin),
RLS tightened from anon-reads-everything to write-only, `content_items` with
stable derived ids for all 142 questions, `learning_events` telemetry wired into
all 10 question-asking games, offline-first with a localStorage queue.

**Dashboard** (`/dashboard`) — item analysis (p-value, latency, audio replays),
weekly activity, per-game accuracy, "questions to look at", content coverage.

**Triage** (`/ideas`) — votes with real identity, comments, image and link
attachments, and a decision note required by a database constraint. Optional
one-way Linear sync with a signed webhook for status coming back.

**Labelling** (`/label`) — a queue ordered by signal, five-axis rubric, required
reasons on rejection, voice notes transcribed by ElevenLabs Scribe, gold-standard
checks, per-rater credit.

## Next

**Get the team in.** Redirect URLs configured, everyone signed in and assigned a
role, one labelling session together to calibrate the rubric. Nothing below is
worth doing before this — the system is built and has almost no data in it.

**AI content pipeline with honest uncertainty.** Generate candidate items and
audio, land them as `status = 'draft'` plus a `label_task` carrying a specific
`uncertainty_reason` from a fixed taxonomy — `difficulty_unknown`,
`cultural_accuracy_unverified`, `distractors_weak`, `image_layout_unchecked`,
`audio_pronunciation_unverified`, `translation_ambiguous`. The generator says
what it isn't sure about; a human answers exactly that. The reason strings are
already rendered by the labelling UI.

**Cohen's / Fleiss' κ on the dashboard.** Percent agreement is already
computable; κ needs the marginals and is worth doing properly once there are
enough overlapping labels to mean anything.

**Dataset export.** `scripts/export-dataset.mjs` → versioned JSONL of item,
expert labels, agreement, behavioural stats, plus a datasheet. This is the
artifact that gets shown to people.

**PWA hardening.** Service worker precaching the shell, all 82 audio clips and
the vocab SVGs; real 192/512 PNG icons (the manifest currently points at an SVG);
iOS splash; install prompt. Fixes the spotty-gym-Wi-Fi problem properly.

**Games complete.** Six of eleven games are `hidden: true`. Unhide against a
written quality bar: no answer leaked on the prompt card, correct answer always
reachable, works at 360px, audio present, and at least two passing expert labels
on its items. The labelling data decides this rather than taste. Aitys stays out
until the couplets actually rhyme.

**Maze.** The universal snippet is already live. Add triggered in-app surveys at
meaningful moments (end of a run, first homework submission) and an importer for
CSV exports into a `research_findings` table joinable to ideas and items. Maze's
public API is thin; CSV is the honest path and beats findings living only in
`app.maze.co`.

**Store apps.** Capacitor wrapping the same build, when there is a reason to pay
for developer accounts and sit through review. Nothing above is blocked by it.

**Contributor credits page.** Generated from idea authorship, label counts, and
commit history: who proposed what, who judged what, what shipped because of it.

## Deliberately not doing

**A separate React Native app.** All eleven games are web canvas/DOM. A native
rewrite forks the thing that actually works.

**Dual-axis dashboard charts, or more chart colours.** Two measures of different
scale get two charts.

**Personalisation before RQ2 has an answer.** Ordering items by a model we
haven't validated would be theatre.
