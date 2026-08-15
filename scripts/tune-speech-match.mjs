// Evaluate src/lib/speech-match.ts against real ASR output.
//
//   node scripts/tune-speech-match.mjs
//
// For every recorded vocab word A and every possible wall target B, it asks:
// "if a kid said A while the wall was asking for B, would the game accept it?"
//
//   A === B  -> should accept. A miss here is the "it can't hear me" bug.
//   A !== B  -> should reject. An accept here is the "it takes anything" bug.
//
// The ASR side is cached in scripts/fixtures/asr-transcripts.json — one real
// Groq whisper-large-v3 transcript per recording in public/audio/vocab. That
// cache is the point: thresholds can be re-tuned as often as you like without
// spending a single API call, and two people tuning are looking at the same
// numbers. Regenerate it only if the recordings change (see REGENERATING).
//
// Before this existed the thresholds were, by the old comment's own admission,
// "untuned against real recordings ... a judgment call", and they were costing
// 327 false accepts out of 8372 wrong-word pairs.
//
// REGENERATING the cache: transcribe each public/audio/vocab/<slug>.mp3 with
// whisper-large-v3 at language=kk and write { slug: transcript }. Mind the
// provider's per-minute limit; ~3.3s between calls is enough for Groq's free
// tier.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const transcripts = JSON.parse(readFileSync(join(here, "fixtures/asr-transcripts.json"), "utf8"));

// Parsed straight out of the TS source so this script has no build step and
// cannot drift from the real vocab list.
const vocabSource = readFileSync(join(here, "../src/content/vocab.ts"), "utf8");
const VOCAB = [...vocabSource.matchAll(
  /\{\s*slug:\s*"([^"]+)",\s*kk:\s*"([^"]+)",\s*latin:\s*"([^"]+)"[^}]*?category:\s*"([^"]+)"/g,
)].map(([, slug, kk, latin, category]) => ({ slug, kk, latin, category }));

// Mirrors src/lib/speech-match.ts. Kept as a copy on purpose: this script is
// how you try a change *before* editing the real matcher.
const FOLD = {
  "ә": "а", "ө": "о", "ұ": "у", "ү": "у", "і": "и", "қ": "к", "ғ": "г", "ң": "н", "һ": "х",
  "á": "a", "ó": "o", "ú": "u", "ń": "n", "í": "i", q: "k", "ǵ": "g", j: "zh",
};
const fold = (t) => t.toLowerCase().split("").map((c) => FOLD[c] ?? c).join("");
const normalize = (t) =>
  fold(t.normalize("NFC").trim()).replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim();

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

function similarity(a, b, cfg) {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na && !nb) return 1;
  const maxLen = Math.max(na.length, nb.length, 1);
  return 1 - levenshtein(na, nb) / (maxLen + cfg.pad(maxLen));
}
const scoreOf = (text, item, cfg) =>
  Math.max(similarity(text, item.kk, cfg), similarity(text, item.latin, cfg));

function accepts(transcript, target, distractors, cfg) {
  const tokens = transcript.trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return false;
  const windows = [];
  for (let i = 0; i < tokens.length; i++) {
    windows.push(tokens[i]);
    if (i + 1 < tokens.length) windows.push(`${tokens[i]} ${tokens[i + 1]}`);
  }
  let best = { score: -1, runnerUp: 0 };
  for (const w of windows) {
    const score = scoreOf(w, target, cfg);
    if (score <= best.score) continue;
    best = { score, runnerUp: distractors.reduce((m, d) => Math.max(m, scoreOf(w, d, cfg)), 0) };
  }
  return best.score >= cfg.conf && best.score - best.runnerUp >= cfg.margin;
}

const items = VOCAB.filter((v) => typeof transcripts[v.slug] === "string" && transcripts[v.slug].trim());
const distractorsFor = (t) =>
  VOCAB.filter((v) => v.category === t.category && v.slug !== t.slug).slice(0, 2);

function evaluate(cfg) {
  let hit = 0, miss = 0, falseAccept = 0;
  const missed = [];
  for (const spoken of items) {
    for (const target of items) {
      const ok = accepts(transcripts[spoken.slug], target, distractorsFor(target), cfg);
      if (spoken.slug === target.slug) {
        if (ok) hit++;
        else { miss++; missed.push(`${spoken.kk} heard as ${JSON.stringify(transcripts[spoken.slug].trim())}`); }
      } else if (ok) falseAccept++;
    }
  }
  return { hit, miss, falseAccept, missed, pairs: items.length * (items.length - 1) };
}

// What src/lib/speech-match.ts does today.
const SHIPPING = { conf: 0.58, margin: 0.14, pad: (n) => (n <= 4 ? 1 : 2) };

const variants = [
  ["shipping           ", SHIPPING],
  ["flat pad 2 (before)", { conf: 0.58, margin: 0.14, pad: () => 2 }],
  ["stricter conf .70  ", { conf: 0.7, margin: 0.26, pad: (n) => (n <= 4 ? 1 : 2) }],
  ["pad 0 under 4      ", { conf: 0.58, margin: 0.14, pad: (n) => (n <= 3 ? 0 : n <= 4 ? 1 : 2) }],
];

console.log(`${items.length} recordings, ${items.length * items.length} word pairs\n`);
console.log("config                 recognised   false accepts");
for (const [label, cfg] of variants) {
  const r = evaluate(cfg);
  console.log(
    `${label}   ${String(r.hit).padStart(3)}/${r.hit + r.miss}      ` +
    `${String(r.falseAccept).padStart(4)} / ${r.pairs}  (${((r.falseAccept / r.pairs) * 100).toFixed(1)}%)`,
  );
}

const shipping = evaluate(SHIPPING);
console.log(`\nNot recognised at shipping thresholds:`);
for (const m of shipping.missed) console.log(`  ${m}`);
