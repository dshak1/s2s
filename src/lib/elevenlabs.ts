const API = "https://api.elevenlabs.io";

export function elevenLabsEnabled(): boolean {
  return Boolean(process.env.ELEVENLABS_API_KEY);
}

export function elevenLabsVoiceId(): string {
  return (
    process.env.ELEVENLABS_VOICE_ID ||
    process.env.ELEVENLABS_KAZAKH_VOICE_ID ||
    "21m00Tcm4TlvDq8ikWAM"
  );
}

export async function generateSpeech(input: {
  text: string;
  voiceId?: string | null;
}): Promise<{ content: Buffer; contentType: string; voiceId: string; modelId: string }> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("Set ELEVENLABS_API_KEY to generate replacement audio.");

  const voiceId = input.voiceId || elevenLabsVoiceId();
  // eleven_v3, not eleven_multilingual_v2 — Kazakh is only in v3. Asked the
  // API directly (GET /v1/models, which reports each model's language list):
  // v3 carries 74 languages including kk, while multilingual_v2 (29) and
  // turbo/flash_v2_5 (32) have no Kazakh at all. This function is what the
  // ticket agent calls to regenerate a clip when a kid reports a bad
  // pronunciation, so it was answering "this word sounds wrong" with a model
  // that cannot speak the language. scripts/gen-new-vocab-audio.mjs already
  // pinned v3; this is the same choice, made in the one place that had drifted.
  const modelId = process.env.ELEVENLABS_MODEL_ID || "eleven_v3";
  const res = await fetch(
    `${API}/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": key,
        Accept: "audio/mpeg",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: input.text,
        model_id: modelId,
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.75,
        },
      }),
    },
  );

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`ElevenLabs ${res.status}: ${detail.slice(0, 240)}`);
  }

  return {
    content: Buffer.from(await res.arrayBuffer()),
    contentType: res.headers.get("content-type") || "audio/mpeg",
    voiceId,
    modelId,
  };
}
