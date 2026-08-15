import { NextResponse, type NextRequest } from "next/server";

// Say-and-shift's mic check: audio in, transcript out. Anonymous route (kids
// have no session), same shape as /api/report-question — service-role-free
// here since there's nothing to write, just a speech-to-text call to proxy so
// the API key never reaches the client.
//
// The transcript is returned as-is; word-spotting against the wall's target
// happens client-side in src/lib/speech-match.ts so the confidence/margin
// thresholds can be tuned without a deploy.
//
// Called roughly every 900ms while the mic listens continuously (see
// useWallListener in the game page) — several overlapping recordings are
// usually in flight at once so a word can't fall entirely into a chunk
// boundary. Call volume here is much higher than a push-to-talk design.
//
// TWO PROVIDERS, ON PURPOSE (2026-08-14). This route ran on ElevenLabs Scribe
// alone and the account's free-tier credits ran out mid-workshop-season. Every
// call started coming back 401 `quota_exceeded`, this route turned that into a
// 502, and the client read `json.transcript ?? ""` — so the game silently
// stopped accepting *any* spoken answer, with no error anywhere a kid or a
// facilitator could see it. Recognition being down is survivable; being down
// invisibly is not. Scribe stays primary (better on low-resource Kazakh), Groq
// Whisper takes over the moment Scribe refuses, and a hard refusal trips a
// cooldown so the next ~5 minutes of windows skip the wasted round trip
// entirely instead of paying a failed request each.

const ELEVENLABS_ENDPOINT = "https://api.elevenlabs.io/v1/speech-to-text";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/audio/transcriptions";
const MAX_BYTES = 5 * 1024 * 1024; // one ~1.8s overlapping window, not a voice note
const RATE_LIMIT = 450; // overlapping windows roughly double the old chunk rate
const WINDOW_MS = 60 * 60 * 1000;

// Two very different failures, so two very different cooldowns.
//
// DEAD (401/402) is an out-of-credits or bad key: nothing changes for hours,
// so sit the provider out long enough that it stops costing a round trip on
// every window, but short enough that a topped-up account recovers on its own
// without a deploy.
//
// THROTTLED (429) is per-minute rate limiting and clears in seconds — Groq's
// free tier allows 20 requests/minute and says "try again in 3s" in the body.
// Treating that as a dead provider (which the first cut of this did) locks out
// a perfectly healthy provider for five minutes over a three second wait, and
// with both providers benched the route returns 503 and the game gives up.
const DEAD_COOLDOWN_MS = 5 * 60 * 1000;
const THROTTLED_COOLDOWN_MS = 8 * 1000;

// Best-effort, in-memory rate limit. Resets on cold start; there is no
// durable table for mic attempts and the risk here is transcription spend, not
// spam rows, so an exact cross-instance count isn't worth a migration.
const attempts = new Map<string, number[]>();

// Same caveat as the rate limit: per-instance, resets on cold start. A stale
// cooldown costs one wasted request on a new instance, which is fine. The
// reason is kept because "benched for 8s by rate limiting" and "benched for
// 5min with a dead key" mean opposite things to the client.
const coolingDown = new Map<string, { until: number; reason: "dead" | "throttled" }>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const since = now - WINDOW_MS;
  const recent = (attempts.get(key) ?? []).filter((t) => t > since);
  recent.push(now);
  attempts.set(key, recent);
  return recent.length > RATE_LIMIT;
}

function benchedReason(provider: string): "dead" | "throttled" | null {
  const entry = coolingDown.get(provider);
  if (!entry) return null;
  if (Date.now() >= entry.until) {
    coolingDown.delete(provider);
    return null;
  }
  return entry.reason;
}

// How long this provider should sit out, or 0 to not bench it at all.
// Anything that is not an auth/quota/throttle answer (500s, network blips) is
// worth retrying on the very next window, so it does not trip the breaker.
function cooldownFor(status: number): number {
  if (status === 401 || status === 402) return DEAD_COOLDOWN_MS;
  if (status === 429) return THROTTLED_COOLDOWN_MS;
  return 0;
}

type ProviderResult =
  | { ok: true; transcript: string }
  | { ok: false; status: number; detail: string };

async function transcribeWithElevenLabs(audio: File, key: string): Promise<ProviderResult> {
  const outgoing = new FormData();
  outgoing.append("file", audio, audio.name || "say.webm");
  outgoing.append("model_id", "scribe_v1");
  // Pinned, not auto-detected: a single Kazakh word from a child frequently
  // gets guessed as Russian and transliterated badly otherwise. "kk" is the
  // ISO-639-1 code — "kaz" (639-3) was here first and may not be a code
  // Scribe actually recognizes, silently falling back to auto-detect.
  outgoing.append("language_code", "kk");
  outgoing.append("tag_audio_events", "false");

  const res = await fetch(ELEVENLABS_ENDPOINT, {
    method: "POST",
    headers: { "xi-api-key": key },
    body: outgoing,
  });

  if (!res.ok) {
    return { ok: false, status: res.status, detail: (await res.text()).slice(0, 300) };
  }
  const json = (await res.json()) as { text?: string };
  return { ok: true, transcript: json.text ?? "" };
}

async function transcribeWithGroq(audio: File, key: string): Promise<ProviderResult> {
  const outgoing = new FormData();
  outgoing.append("file", audio, audio.name || "say.webm");
  outgoing.append("model", "whisper-large-v3");
  // Same reason as Scribe's language_code: pin Kazakh rather than letting a
  // one-word clip get auto-detected as Russian.
  outgoing.append("language", "kk");
  outgoing.append("response_format", "json");

  const res = await fetch(GROQ_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: outgoing,
  });

  if (!res.ok) {
    return { ok: false, status: res.status, detail: (await res.text()).slice(0, 300) };
  }
  const json = (await res.json()) as { text?: string };
  return { ok: true, transcript: json.text ?? "" };
}

export async function POST(request: NextRequest) {
  const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  if (!elevenLabsKey && !groqKey) {
    return NextResponse.json(
      { error: "Speech check is off, set ELEVENLABS_API_KEY or GROQ_API_KEY.", code: "unconfigured" },
      { status: 501 },
    );
  }

  const incoming = await request.formData();
  const audio = incoming.get("audio");
  const profileId = String(incoming.get("profile_id") ?? "").trim();
  if (!(audio instanceof File)) {
    return NextResponse.json({ error: "No audio in request.", code: "bad_request" }, { status: 400 });
  }
  if (audio.size > MAX_BYTES) {
    return NextResponse.json({ error: "Recording too long.", code: "bad_request" }, { status: 413 });
  }

  const rateKey = profileId || request.headers.get("x-forwarded-for") || "anon";
  if (rateLimited(rateKey)) {
    return NextResponse.json(
      { error: "Too many tries for now, take a breather.", code: "rate_limited" },
      { status: 429 },
    );
  }

  // Scribe first (stronger on Kazakh), Groq second. A provider in cooldown is
  // skipped outright rather than retried and failed.
  const providers: { name: string; run: () => Promise<ProviderResult> }[] = [];
  if (elevenLabsKey) {
    providers.push({ name: "elevenlabs", run: () => transcribeWithElevenLabs(audio, elevenLabsKey) });
  }
  if (groqKey) {
    providers.push({ name: "groq", run: () => transcribeWithGroq(audio, groqKey) });
  }

  let detail = "Speech check failed.";
  // Whether anything that went wrong was merely per-minute throttling. If the
  // only thing standing between us and a transcript is a few seconds of rate
  // limit, this request fails but the game must not conclude the service is
  // down — the next window will very likely succeed.
  let onlyThrottled = true;

  for (const provider of providers) {
    const benched = benchedReason(provider.name);
    if (benched) {
      if (benched === "dead") onlyThrottled = false;
      continue;
    }
    try {
      const result = await provider.run();
      if (result.ok) {
        return NextResponse.json({ transcript: result.transcript, provider: provider.name });
      }
      detail = result.detail;
      const cooldown = cooldownFor(result.status);
      const reason = result.status === 429 ? "throttled" : "dead";
      if (cooldown > 0) {
        coolingDown.set(provider.name, { until: Date.now() + cooldown, reason });
        console.error(
          `[say-check] ${provider.name} ${reason} ${result.status}, benched ${cooldown / 1000}s: ${result.detail}`,
        );
      } else {
        console.error(`[say-check] ${provider.name} failed ${result.status}: ${result.detail}`);
      }
      if (result.status !== 429) onlyThrottled = false;
    } catch (err) {
      detail = err instanceof Error ? err.message : "Speech check failed.";
      console.error(`[say-check] ${provider.name} threw: ${detail}`);
      onlyThrottled = false;
    }
  }

  // `code` is what the client keys off. "busy" means keep listening, this
  // window just did not get through; "unavailable" means stop asking and flip
  // the game to tap-to-answer rather than leave a kid talking at a mic that
  // cannot hear them.
  return NextResponse.json(
    {
      error: onlyThrottled ? "Speech check is busy, try the next window." : "Speech check is unavailable right now.",
      code: onlyThrottled ? "busy" : "unavailable",
      detail,
    },
    { status: 503 },
  );
}
