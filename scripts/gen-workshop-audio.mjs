// One-off: TTS for the terms Workshop 1 (22 August 2026) introduced.
//
// Only the words written out in src/content/workshops.ts — the six that are
// `ref`s into VOCAB (тау, алма, өзен, жасыл, гүл, күн) already have clips from
// the earlier runs and must not be regenerated, or the same word would end up
// in two voices.
//
// Same shape as gen-new-vocab-audio.mjs: mirrors src/lib/elevenlabs.ts's
// generateSpeech, run as a plain script since that module reads process.env
// directly (fine here, .env.local is sourced by the caller).
import { existsSync, writeFileSync } from "node:fs";

const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) {
  console.error("Set ELEVENLABS_API_KEY first.");
  process.exit(1);
}

// Jessica / eleven_v3 — same voice+model as every clip before it, so a
// workshop's words don't sound like a different narrator mid-lesson.
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || process.env.ELEVENLABS_KAZAKH_VOICE_ID || "cgSgspJ2msm6clMCkdW9";
const MODEL_ID = process.env.ELEVENLABS_MODEL_ID || "eleven_v3";

const WORDS = [
  ["tabigat", "Табиғат"], ["koktobe", "Көктөбе"],
  ["baiterek", "Бәйтерек"], ["zamanaui-qala", "Заманауи қала"],
  ["suyq-qys", "Суық қыс"], ["biik-gimarat", "Биік ғимарат"],
  ["tarih", "Тарих"], ["kone-qala", "Көне қала"],
  ["madeniet", "Мәдениет"], ["kesene", "Кесене"],
  ["ken", "Кен"], ["ondiris", "Өндіріс"], ["universitet", "Университет"],
  ["ulken-qala", "Үлкен қала"], ["zhumys", "Жұмыс"],
  ["zhaiyq", "Жайық"], ["munai", "Мұнай"], ["kopir", "Көпір"], ["balyq", "Балық"],
  ["zhyly", "Жылы"],
];

for (const [slug, text] of WORDS) {
  const out = new URL(`../public/audio/vocab/${slug}.mp3`, import.meta.url);
  // Never overwrite: a clip that exists was made by an earlier run and the
  // free tier's characters are worth more than a redundant re-render.
  if (existsSync(out)) {
    console.log(`skip (exists): ${slug}`);
    continue;
  }
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
  writeFileSync(out, buf);
  console.log(`ok: ${slug} (${buf.length} bytes)`);
}
