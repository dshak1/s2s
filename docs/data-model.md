# Data model

Migrations in `supabase/migrations/`, applied in order. Project `coqvobzfbnidkgshrmqm`.

## Access model in one line

**Anonymous kids write. Only the team reads across rows.**

`is_team()` and `is_staff()` (`0005_identity.sql`) are `SECURITY DEFINER` helpers
used by nearly every policy. Views are declared `security_invoker = on` — without
it a view is evaluated as its owner and hands anon a way around every read policy.

## Tables

### Learners

| Table | Contents | Anon | Team |
|---|---|---|---|
| `profiles` | kid display name, XP, mastery | insert, update | read |
| `sessions` | workshop session codes | read (needed to join) | full |
| `attendance` | who is at which table | insert, update | read |
| `game_runs` | one row per completed round | insert, update | read |
| `kid_artifacts` | drawings, uploads, backgrounds | insert, update | read |
| `homework_items` | homework photos + labels | insert, update | read |
| `profile_badges` | awarded badges | insert, update | read |

`profiles.id` is a `crypto.randomUUID()` generated on the device. There is no
name, email, or stable device identifier anywhere in this group.

### Content and telemetry

**`content_items`** — every question the games can ask.

| Column | Notes |
|---|---|
| `id` | `<kind>:<ref_slug>:v<n>`, e.g. `vocab:ake:v1`. Derived, not generated |
| `item_key` | `<kind>:<ref_slug>` — stable across versions |
| `kind` | `vocab` \| `letter` \| `greeting` \| `phrase` \| `place` \| `generated` |
| `payload` | jsonb: prompt, answer, media paths |
| `source` | `seed` \| `ai` \| `human` |
| `status` | `draft` \| `live` \| `retired` |

Revising a question means a new version, so labels and events stay attached to
the exact wording they were about.

**`learning_events`** — one row per answer. No FK on `item_id`, on purpose; see
[telemetry.md](telemetry.md).

### Team

| Table | Contents |
|---|---|
| `team_members` | `auth.users` id, display name, `role` (pending/member/admin), `expertise` (descriptive only). First sign-in becomes admin |

### Tickets

| Table | Contents |
|---|---|
| `tickets` | `ref` (S2S-14), `type`, `title`, `body`, `status`, `priority`, `assignee_id`, plus `decision_note`, `preview_url`, `linear_issue_url` |
| `ticket_votes` | `(ticket_id, voter_id)` — one vote per person, trigger keeps the counter in sync |
| `ticket_comments` | discussion |
| `ticket_attachments` | uploaded images and inspiration links |

Three types, deliberately. A game bug is a bug with a `game_slug`, not its own
species:

- `bug` — something in the app is broken
- `request` — a change or a new feature (the same thing)
- `question` — a specific content item is wrong. Carries `item_id` (a
  `content_items` id) and `problem` (`wrong_answer`, `bad_audio`,
  `poor_question`, `unclear`, `culturally_wrong`, `too_hard`, `too_easy`), so a
  flag lines up with the labelling queue and item analytics.

A CHECK constraint enforces that any status other than `inbox` carries a
`decision_note` of at least 10 characters. The response loop is a database
invariant, not a convention.

`wishlist_items` still exists, archived — `0015` copied it into `tickets` and no
app code reads it.

### Labelling

| Table | Contents |
|---|---|
| `label_tasks` | why an item is in the queue: `origin` + `uncertainty_reason` |
| `labels` | verdict, five 1–5 axes, reason, voice note path, transcript, confidence, time spent |
| `label_gold` | known-answer items for rater QA — **staff-only readable** |

A CHECK rejects a `bad` verdict with no reason. `unique (item_id, rater_id)` means
one label per person per item, updatable.

## Views

| View | Answers |
|---|---|
| `v_item_stats` | Per question: p-value, median latency, audio replays, learners |
| `v_game_stats` | Per game: plays, accuracy, median latency |
| `v_learner_weekly` | Weekly active learners, events, accuracy |
| `v_run_weekly` | Weekly runs and XP from `game_runs` |
| `v_coverage` | Items with audio / image / live, per kind |
| `v_item_quality` | Expert labels ⋈ observed behaviour — the RQ2 table |
| `v_rater_stats` | Per-rater counts, for credit |

## Functions

| Function | Notes |
|---|---|
| `is_team()`, `is_staff()`, `current_team_role()` | Policy helpers |
| `ensure_team_member(text)` | Called after sign-in; first user becomes admin |
| `label_queue(int)` | The rater's queue. `SECURITY DEFINER` so gold items can reach a rater who cannot read `label_gold`; refuses non-team callers |
| `refresh_analytics_label_tasks(int)` | Turns difficulty outliers into labelling tasks |
| `sync_idea_votes()` | Trigger keeping `wishlist_items.votes` accurate |

## Storage buckets

| Bucket | Public | Contents |
|---|---|---|
| `kid-art` | yes | Drawings, avatars, homework photos |
| `idea-attachments` | yes | Screenshots and mockups on ideas |
| `voice-notes` | **no** | Rater voice notes — people thinking out loud |
