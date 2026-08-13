// One-off: generate TTS for the 20 AI-drafted vocab words added 2026-08-03.
// Mirrors src/lib/elevenlabs.ts's generateSpeech, run as a plain script since
// that module reads process.env directly (fine here, .env.local is sourced
// by the caller).
import { writeFileSync } from "node:fs";

const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) {
  console.error("Set ELEVENLABS_API_KEY first.");
  process.exit(1);
}

// Jessica / eleven_v3 — same voice+model the original 72 clips used
// (2026-07-18 session), so the new 20 don't sound like a different narrator.
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || process.env.ELEVENLABS_KAZAKH_VOICE_ID || "cgSgspJ2msm6clMCkdW9";
const MODEL_ID = process.env.ELEVENLABS_MODEL_ID || "eleven_v3";

const WORDS = [
  ["zhanbyr", "Жаңбыр"], ["qar", "Қар"], ["kun", "Күн"], ["zhel", "Жел"],
  ["bult", "Бұлт"], ["ystyq", "Ыстық"], ["suyq", "Суық"],
  ["kitap", "Кітап"], ["qalam", "Қалам"], ["qaryndash", "Қарындаш"],
  ["ustel", "Үстел"], ["oryndyq", "Орындық"], ["mugalim", "Мұғалім"], ["oqushy", "Оқушы"],
  ["agash", "Ағаш"], ["gul", "Гүл"], ["aspan", "Аспан"], ["zhuldyz", "Жұлдыз"],
  ["ai", "Ай"], ["tas", "Тас"],
];

for (const [slug, text] of WORDS) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(VOICE_ID)}`, {
    method: "POST",
    headers: { "xi-api-key": KEY, Accept: "audio/mpeg", "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      model_id: MODEL_ID,
      voice_settings: { stability: 0.45, similarity_boost: 0.75 },
    }),
  });
  if (!res.ok) {
    console.error(`${slug}: ${res.status} ${await res.text()}`);
    continue;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(new URL(`../public/audio/vocab/${slug}.mp3`, import.meta.url), buf);
  console.log(`ok: ${slug}`);
}
