// Word-spotting for say-and-shift's continuous mic listener. Pure — no React,
// no network — so it can be exercised directly against recorded transcripts.
//
// The mic listens continuously while kids talk amongst each other, so a
// chunk's transcript is chatter with the answer somewhere inside it, not a
// single clean utterance ("oh my, what do you think, hurry up... dala...").
// scanForTarget scans every word (and word pair, for multi-word greetings)
// for the target rather than comparing the whole transcript as one blob.
//
// Child ASR is unreliable and Kazakh is low-resource, so this is deliberately
// generous: it folds the grapheme distinctions ASR tends to flatten and
// accepts a hit only when it is both confident AND clearly ahead of the best
// distractor score on that same word — the margin is what stops a garbage
// transcript from randomly landing on the target.

import type { VocabItem } from "@/content/vocab";

export type ScanResult = {
  found: boolean;
  /** Target's best score among the transcript's words, 0-1. */
  score: number;
  /** Best distractor score on the same word that produced `score`. */
  runnerUp: number;
  /** The word (or word pair) that produced `score`, for debugging/logging. */
  matchedText: string | null;
};

// Confusable graphemes ASR (and typed Latin fallbacks) tend to flatten.
// Folding both sides before comparing trades spelling precision for
// forgiveness — sound-it-out is where those distinctions get drilled.
const FOLD: Record<string, string> = {
  "ә": "а",
  "ө": "о",
  "ұ": "у",
  "ү": "у",
  "і": "и",
  "қ": "к",
  "ғ": "г",
  "ң": "н",
  "һ": "х",
  // Latin-script equivalents (VocabItem.latin), folded the same way so a
  // Scribe transliteration lines up with the stored romanization.
  "á": "a",
  "ó": "o",
  "ú": "u",
  "ń": "n",
  "í": "i",
  "q": "k",
  "ǵ": "g",
  "j": "zh",
};

// Two rounds of real playtesting pulled this in opposite directions: 0.62/0.15
// missed real words split across chunk boundaries (fixed separately, by
// overlapping listen windows — see useWallListener), then 0.48/0.08 turned
// out to accept almost anything vaguely similar-length. Splitting the
// difference. Still untuned against real recordings (the spike that needed
// never ran), so treat this as a judgment call to revisit with real data,
// not a settled number.
export const CONFIDENCE_THRESHOLD = 0.58;
export const MARGIN_THRESHOLD = 0.14;

function fold(text: string): string {
  return text
    .toLowerCase()
    .split("")
    .map((ch) => FOLD[ch] ?? ch)
    .join("");
}

function normalize(text: string): string {
  return fold(text.normalize("NFC").trim())
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

// 1 = identical after folding, 0 = maximally different.
function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na && !nb) return 1;
  const maxLen = Math.max(na.length, nb.length, 1);
  return 1 - levenshtein(na, nb) / maxLen;
}

// Score one word (or word pair) against both scripts a candidate carries
// (Scribe sometimes romanizes low-resource output) and keep whichever is higher.
function scoreCandidate(text: string, candidate: VocabItem): number {
  return Math.max(similarity(text, candidate.kk), similarity(text, candidate.latin));
}

export function scanForTarget(
  transcript: string,
  target: VocabItem,
  distractors: VocabItem[],
): ScanResult {
  const tokens = transcript.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return { found: false, score: 0, runnerUp: 0, matchedText: null };
  }

  // Single words plus adjacent pairs, so a two-word greeting like
  // "Сәлеметсіз бе" can still be spotted inside a longer sentence.
  const windows: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    windows.push(tokens[i]);
    if (i + 1 < tokens.length) windows.push(`${tokens[i]} ${tokens[i + 1]}`);
  }

  let best = { score: -1, runnerUp: 0, text: null as string | null };
  for (const window of windows) {
    const targetScore = scoreCandidate(window, target);
    if (targetScore <= best.score) continue;
    const runnerUp = distractors.reduce((max, d) => Math.max(max, scoreCandidate(window, d)), 0);
    best = { score: targetScore, runnerUp, text: window };
  }

  const found = best.score >= CONFIDENCE_THRESHOLD && best.score - best.runnerUp >= MARGIN_THRESHOLD;
  return { found, score: best.score, runnerUp: best.runnerUp, matchedText: best.text };
}
