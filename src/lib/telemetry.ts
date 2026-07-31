"use client";

// Per-question telemetry — one row in learning_events for every answer anyone
// gives, ever. This is the dataset the item-quality analytics and the labelling
// queue are both built on.
//
// Design constraints, in priority order:
//   1. Never lose an event. Workshops run on gym Wi-Fi; the queue survives a
//      reload in localStorage and drains on the next visit.
//   2. Never block or break a game. Every path is fire-and-forget and every
//      failure is silent — a kid must never see a telemetry error.
//   3. Work offline. With no Supabase env vars the queue simply accumulates
//      and is trimmed, exactly like the rest of the app's demo mode.

import { getSupabaseBrowser } from "@/lib/supabase/client";
import { store } from "@/lib/store";

export type PromptKind = "audio" | "text" | "image" | "map";

export type AnswerEvent = {
  gameSlug: string;
  /** Stable content id from src/lib/items.ts, e.g. "vocab:ake:v1". */
  itemId?: string | null;
  promptKind?: PromptKind;
  /** What the learner actually picked/typed, for distractor analysis. */
  response?: string | null;
  isCorrect?: boolean | null;
  latencyMs?: number | null;
  /** 1 for the first try at this item in this round, 2 for the retry, ... */
  attemptIndex?: number;
  hintUsed?: boolean;
  /** How many times they replayed the audio before answering. */
  audioPlays?: number;
};

type QueuedRow = {
  profile_id: string | null;
  session_code: string | null;
  game_slug: string;
  item_id: string | null;
  prompt_kind: PromptKind | null;
  response: string | null;
  is_correct: boolean | null;
  latency_ms: number | null;
  attempt_index: number;
  hint_used: boolean;
  audio_plays: number;
  client_ts: string;
};

const QUEUE_KEY = "s2s.telemetry.queue.v1";
const MAX_BATCH = 20;
const MAX_QUEUE = 500; // hard cap so a permanently offline device can't grow forever
const FLUSH_DEBOUNCE_MS = 4000;

let queue: QueuedRow[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let flushing = false;
let hydrated = false;

// session code -> sessions.id. Resolved at most once per code per page load;
// anon can read the sessions table (see 0005_identity.sql).
const sessionIds = new Map<string, string | null>();

function loadQueue() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (raw) queue = JSON.parse(raw) as QueuedRow[];
  } catch {
    queue = [];
  }
}

function saveQueue() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // quota exceeded — drop the oldest half rather than throwing into a game
    queue = queue.slice(-Math.floor(MAX_QUEUE / 2));
  }
}

async function resolveSessionId(code: string | null): Promise<string | null> {
  if (!code) return null;
  const key = code.toUpperCase();
  if (sessionIds.has(key)) return sessionIds.get(key) ?? null;

  const sb = getSupabaseBrowser();
  if (!sb) return null;

  const { data } = await sb.from("sessions").select("id").eq("code", key).maybeSingle();
  const id = (data?.id as string | undefined) ?? null;
  sessionIds.set(key, id);
  return id;
}

/**
 * Record one answer. Safe to call from any game handler, on every render path,
 * online or off. Returns immediately.
 */
export function logAnswer(evt: AnswerEvent) {
  if (typeof window === "undefined") return;
  loadQueue();

  const profile = store.get();
  queue.push({
    profile_id: profile.id === "server-profile" ? null : profile.id,
    session_code: profile.sessionCode,
    game_slug: evt.gameSlug,
    item_id: evt.itemId ?? null,
    prompt_kind: evt.promptKind ?? null,
    response: evt.response ?? null,
    is_correct: evt.isCorrect ?? null,
    latency_ms: evt.latencyMs ?? null,
    attempt_index: evt.attemptIndex ?? 1,
    hint_used: evt.hintUsed ?? false,
    audio_plays: evt.audioPlays ?? 0,
    client_ts: new Date().toISOString(),
  });

  if (queue.length > MAX_QUEUE) queue = queue.slice(-MAX_QUEUE);
  saveQueue();

  if (queue.length >= MAX_BATCH) {
    void flush();
  } else if (!timer) {
    timer = setTimeout(() => {
      timer = null;
      void flush();
    }, FLUSH_DEBOUNCE_MS);
  }
}

/** Push whatever is queued. Called on a timer, on batch size, and on page hide. */
export async function flush(): Promise<void> {
  if (typeof window === "undefined" || flushing) return;
  loadQueue();
  if (queue.length === 0) return;

  const sb = getSupabaseBrowser();
  if (!sb) return; // offline demo mode — keep the queue, it costs nothing

  flushing = true;
  const batch = queue.slice(0, MAX_BATCH);

  try {
    const rows = await Promise.all(
      batch.map(async ({ session_code, ...row }) => ({
        ...row,
        session_id: await resolveSessionId(session_code),
      })),
    );

    const { error } = await sb.from("learning_events").insert(rows);
    if (!error) {
      queue = queue.slice(batch.length);
      saveQueue();
    }
  } catch {
    // network blip — the batch stays queued for the next attempt
  } finally {
    flushing = false;
  }

  // More waiting? Keep going while the tab is alive.
  if (queue.length >= MAX_BATCH) void flush();
}

if (typeof window !== "undefined") {
  loadQueue();
  // Drain anything left over from a previous visit once the page settles.
  setTimeout(() => void flush(), 2000);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flush();
  });
  window.addEventListener("pagehide", () => void flush());
}
