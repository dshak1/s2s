import { NextResponse, type NextRequest } from "next/server";
import { requireTeam } from "@/lib/auth";

// Voice notes -> text, via ElevenLabs Scribe. Same vendor already generating the
// Kazakh TTS clips, so there is one key to manage rather than two.
//
// The audio itself is uploaded to the private voice-notes bucket by the client
// before this is called, so a transcription failure never loses the thought —
// the recording is still there to retry against.

const ENDPOINT = "https://api.elevenlabs.io/v1/speech-to-text";
const MAX_BYTES = 25 * 1024 * 1024;

export async function POST(request: NextRequest) {
  await requireTeam(undefined, "/label");

  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "Transcription is off, set ELEVENLABS_API_KEY." },
      { status: 501 },
    );
  }

  const incoming = await request.formData();
  const audio = incoming.get("audio");
  if (!(audio instanceof File)) {
    return NextResponse.json({ error: "No audio in request." }, { status: 400 });
  }
  if (audio.size > MAX_BYTES) {
    return NextResponse.json({ error: "Recording too long." }, { status: 413 });
  }

  const outgoing = new FormData();
  outgoing.append("file", audio, audio.name || "note.webm");
  outgoing.append("model_id", "scribe_v1");
  // Raters think out loud in English, Kazakh or Russian — let Scribe detect.
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

    const json = (await res.json()) as { text?: string; language_code?: string };
    return NextResponse.json({
      transcript: json.text ?? "",
      language: json.language_code ?? null,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Transcription failed." },
      { status: 502 },
    );
  }
}
