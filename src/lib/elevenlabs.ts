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
  const modelId = process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";
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
