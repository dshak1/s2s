import { NextResponse, type NextRequest } from "next/server";

// Say-and-shift's mic check: audio in, transcript out. Anonymous route (kids
// have no session), same shape as /api/report-question — service-role-free
// here since there's nothing to write, just an ElevenLabs call to proxy so
// the API key never reaches the client.
//
// The transcript is returned as-is; word-spotting against the wall's target
// happens client-side in src/lib/speech-match.ts so the confidence/margin
// thresholds can be tuned without a deploy.
//
// Called roughly every 900ms while the mic listens continuously (see
// useWallListener in the game page) — several overlapping recordings are
// usually in flight at once so a word can't fall entirely into a chunk
// boundary. Call volume here is much higher than a push-to-talk design. The
// rate limit is sized for that; each call still costs Scribe minutes, so it
// is not unlimited.

const ENDPOINT = "https://api.elevenlabs.io/v1/speech-to-text";
const MAX_BYTES = 5 * 1024 * 1024; // one ~1.8s overlapping window, not a voice note
const RATE_LIMIT = 450; // overlapping windows roughly double the old chunk rate
const WINDOW_MS = 60 * 60 * 1000;

// Best-effort, in-memory rate limit. Resets on cold start; there is no
// durable table for mic attempts and the risk here is Scribe minutes, not
// spam rows, so an exact cross-instance count isn't worth a migration.
const attempts = new Map<string, number[]>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const since = now - WINDOW_MS;
  const recent = (attempts.get(key) ?? []).filter((t) => t > since);
  recent.push(now);
  attempts.set(key, recent);
  return recent.length > RATE_LIMIT;
}

export async function POST(request: NextRequest) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "Speech check is off, set ELEVENLABS_API_KEY." }, { status: 501 });
  }

  const incoming = await request.formData();
  const audio = incoming.get("audio");
  const profileId = String(incoming.get("profile_id") ?? "").trim();
  if (!(audio instanceof File)) {
    return NextResponse.json({ error: "No audio in request." }, { status: 400 });
  }
  if (audio.size > MAX_BYTES) {
    return NextResponse.json({ error: "Recording too long." }, { status: 413 });
  }

  const rateKey = profileId || request.headers.get("x-forwarded-for") || "anon";
  if (rateLimited(rateKey)) {
    return NextResponse.json({ error: "Too many tries for now, take a breather." }, { status: 429 });
  }

  const outgoing = new FormData();
  outgoing.append("file", audio, audio.name || "say.webm");
  outgoing.append("model_id", "scribe_v1");
  // Pinned, not auto-detected: a single Kazakh word from a child frequently
  // gets guessed as Russian and transliterated badly otherwise. "kk" is the
  // ISO-639-1 code — "kaz" (639-3) was here first and may not be a code
  // Scribe actually recognizes, silently falling back to auto-detect.
  outgoing.append("language_code", "kk");
  outgoing.append("tag_audio_events", "false");

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "xi-api-key": key },
      body: outgoing,
    });

    if (!res.ok) {
      const detail = await res.text();
      return NextResponse.json(
        { error: `ElevenLabs ${res.status}`, detail: detail.slice(0, 300) },
        { status: 502 },
      );
    }

    const json = (await res.json()) as { text?: string };
    return NextResponse.json({ transcript: json.text ?? "" });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Speech check failed." },
      { status: 502 },
    );
  }
}
