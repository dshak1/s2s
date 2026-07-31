# Telemetry

One row in `learning_events` per question answered, by anyone, ever. This is the
dataset everything else is built on.

## Design constraints, in priority order

1. **Never lose an event.** Workshops run on gym Wi-Fi. The queue persists to
   localStorage and drains on the next visit.
2. **Never block or break a game.** Every path is fire-and-forget and every
   failure is silent. A kid must never see a telemetry error.
3. **Work offline.** With no Supabase env vars the queue accumulates and is
   trimmed, like the rest of demo mode.

## How it flows

```
game answer handler
  └─ logAnswer({ gameSlug, itemId, isCorrect, latencyMs, ... })
       └─ push to in-memory queue → mirror to localStorage
            └─ flush on: 20 queued · 4s idle · visibilitychange · pagehide
                 └─ resolve session code → session id (cached, once per code)
                      └─ insert batch into learning_events
```

Failures leave the batch queued. The hard cap is 500 events, oldest dropped, so
a permanently offline device cannot grow without bound.

## What gets recorded

| Field | Why it exists |
|---|---|
| `item_id` | Joins to `content_items`; the whole point |
| `is_correct` | p-value / item difficulty |
| `response` | What they actually picked — distractor analysis |
| `latency_ms` | Hesitation; a proxy for "hard but guessable" |
| `audio_plays` | Replays before answering — a proxy for unclear audio |
| `attempt_index` | Position in the round |
| `hint_used` | Reserved; no game exposes hints yet |

There is deliberately **no foreign key** on `item_id`. Telemetry must never fail
a write because content drifted ahead of the items table. Orphan ids show up in
the coverage panel, which is a signal worth seeing rather than an error worth
losing the event over.

## Adding telemetry to a new game

One call in the existing answer handler:

```ts
import { logAnswer } from "@/lib/telemetry";
import { vocabItemId } from "@/lib/items";

logAnswer({
  gameSlug: "my-game",
  itemId: vocabItemId(target),
  promptKind: "audio",        // audio | text | image | map
  response: picked.slug,       // what they chose, not what was right
  isCorrect: picked.slug === target.slug,
  latencyMs: Date.now() - shownAt.current,
  attemptIndex: roundIndex + 1,
  audioPlays: audioPlays.current,
});
```

Rules of thumb:

- Log **every** attempt, including wrong ones and timeouts. A word that runs out
  of time in Falling Words is logged with `response: null`, which is a different
  signal from picking the wrong basket.
- Time from when the prompt was **shown**, not from mount.
- Count only deliberate audio replays, not autoplay.
- Keep `store.recordGameRun` as well. It is the per-session aggregate; this is
  the per-question detail.

## Where the data surfaces

- `v_item_stats` — p-value, median latency, audio replays, distinct learners.
- `/dashboard` → "Questions to look at": p-value below 0.20 or above 0.95 with
  5+ attempts.
- `refresh_analytics_label_tasks()` turns those same outliers into labelling
  tasks, so the data nominates its own bad questions.
