// Every question and every generated clip, as one flat checklist.
//
// The games each own their content file, which is right for the games and wrong
// for the person who has to check the lot. This flattens all of it into one
// shape so /verify can render an item without knowing which game it came from,
// and so "how much is left" is a number rather than a guess.
//
// Ids come from src/lib/items.ts, the same ids telemetry logs, so a verdict
// here lines up with the accuracy data for the same question.

import { ALPHABET } from "@/content/alphabet";
import { KAZAKH_ONLY_LETTERS, LETTER_AUDIO_SRC } from "@/content/letter-audio";
import { CATEGORY_LABELS, VOCAB } from "@/content/vocab";
import { GREETINGS } from "@/content/greetings";
import { CLUES, PHRASES } from "@/content/phrases";
import { COUPLETS } from "@/content/aitys-couplets";
import { PLACES } from "@/content/places";
import {
  greetingItemId,
  itemId,
  letterItemId,
  phraseItemId,
  placeItemId,
  vocabItemId,
} from "@/lib/items";

export type VerifyKind = "letter" | "vocab" | "greeting" | "phrase" | "clue" | "couplet" | "place";

export type VerifyItem = {
  id: string;
  kind: VerifyKind;
  /** Where it shows up, for the reviewer's benefit: "Vocab · Animals". */
  group: string;
  /** The Kazakh being checked. */
  kk: string;
  latin?: string;
  en?: string;
  ru?: string;
  /** A generated clip to listen to, when there is one. */
  audio?: string;
  /** What a kid is asked, when the item is a question rather than a word. */
  prompt?: string;
  options?: string[];
  answer?: string;
  /** Couplet lines, "___" marking each blank. */
  lines?: string[];
  /** Drafted by a model and never checked by a native speaker. */
  aiDrafted?: boolean;
  /** Lower goes out first. */
  priority: number;
};

export const KIND_LABELS: Record<VerifyKind, string> = {
  letter: "Letter clip",
  vocab: "Word",
  greeting: "Greeting clip",
  phrase: "Phrase",
  clue: "Quiz question",
  couplet: "Aitys couplet",
  place: "Place fact",
};

// What to actually check, per kind. Written out because "verify this" means
// something different for a synthesized letter clip than for a translation, and
// a reviewer who has to invent the standard applies a different one each time.
export const KIND_CHECKS: Record<VerifyKind, string[]> = {
  letter: [
    "The clip says the letter the way a teacher would say it in class",
    "It is the Kazakh sound, not the Russian one",
    "The Latin letter next to it matches the 2021 reform",
  ],
  vocab: [
    "The clip pronounces the word clearly, with the stress in the right place",
    "Cyrillic, Latin and the English gloss all agree",
    "A kid would actually meet this word in this meaning",
  ],
  greeting: [
    "The clip sounds like a person greeting someone, not reading a list",
    "The formal/informal note is right",
    "The English and Russian glosses match the register",
  ],
  phrase: [
    "The Kazakh is natural, not translated word for word",
    "The English and Russian mean the same thing",
  ],
  clue: [
    "The marked answer is the only correct one",
    "The other options are wrong but plausible — not obviously filler",
    "The question is answerable by a kid who knows the word",
  ],
  couplet: [
    "The lines scan and rhyme like a real aitys couplet",
    "Each blank has exactly one word that fits",
    "The translation matches the Kazakh",
  ],
  place: [
    "The fact is true and not out of date",
    "It's the kind of thing worth telling a kid about this place",
    "The Kazakh name is spelled right",
  ],
};

// Placeholder couplets and AI-drafted vocab are the two things most likely to be
// wrong, so they go first. Kazakh-only letters next: they are the whole point of
// Sound It Out, and a bad clip there teaches the Russian sound instead.
export const VERIFY_ITEMS: VerifyItem[] = [
  ...COUPLETS.map((couplet) => ({
    id: itemId("generated", `couplet:${couplet.id}`),
    kind: "couplet" as const,
    group: "Aitys Battle",
    kk: couplet.lines.join(" / "),
    en: couplet.translation,
    lines: couplet.lines,
    answer: couplet.answers.join(", "),
    options: couplet.decoys,
    // The content file says so itself: hand-written placeholders waiting on real
    // rhyming lines from someone who writes Kazakh verse.
    aiDrafted: true,
    priority: 0,
  })),
  ...VOCAB.filter((word) => word.aiDrafted).map((word) => ({
    id: vocabItemId(word),
    kind: "vocab" as const,
    group: `Vocab · ${CATEGORY_LABELS[word.category]}`,
    kk: word.kk,
    latin: word.latin,
    en: word.en,
    ru: word.ru,
    audio: `/audio/vocab/${word.slug}.mp3`,
    aiDrafted: true,
    priority: 1,
  })),
  ...ALPHABET.filter((letter) => LETTER_AUDIO_SRC[letter.cyr]).map((letter) => ({
    id: letterItemId(letter),
    kind: "letter" as const,
    group: KAZAKH_ONLY_LETTERS.includes(letter.cyr)
      ? "Alphabet · Kazakh-only"
      : "Alphabet",
    kk: letter.cyr,
    latin: letter.latin,
    audio: LETTER_AUDIO_SRC[letter.cyr],
    priority: KAZAKH_ONLY_LETTERS.includes(letter.cyr) ? 2 : 4,
  })),
  ...CLUES.map((clue) => ({
    id: itemId("generated", `clue:${clue.id}`),
    kind: "clue" as const,
    group: "Snow Leopard Patrol",
    kk: clue.answer,
    prompt: clue.prompt,
    options: clue.options,
    answer: clue.answer,
    priority: 3,
  })),
  ...GREETINGS.map((greeting) => ({
    id: greetingItemId(greeting),
    kind: "greeting" as const,
    group: "Greetings Quiz",
    kk: greeting.kk,
    latin: greeting.latin,
    en: greeting.en,
    ru: greeting.ru,
    audio: greeting.audio,
    priority: 3,
  })),
  ...VOCAB.filter((word) => !word.aiDrafted).map((word) => ({
    id: vocabItemId(word),
    kind: "vocab" as const,
    group: `Vocab · ${CATEGORY_LABELS[word.category]}`,
    kk: word.kk,
    latin: word.latin,
    en: word.en,
    ru: word.ru,
    audio: `/audio/vocab/${word.slug}.mp3`,
    priority: 5,
  })),
  ...PHRASES.map((phrase) => ({
    id: phraseItemId(phrase),
    kind: "phrase" as const,
    group: "Story Maker",
    kk: phrase.kk,
    en: phrase.en,
    ru: phrase.ru,
    priority: 6,
  })),
  ...PLACES.map((place) => ({
    id: placeItemId(place),
    kind: "place" as const,
    group: "Where in Kazakhstan?",
    kk: place.kk,
    en: place.fact,
    priority: 6,
  })),
];

export const VERIFY_TOTAL = VERIFY_ITEMS.length;

const BY_ID = new Map(VERIFY_ITEMS.map((item) => [item.id, item]));

export function verifyItem(id: string): VerifyItem | undefined {
  return BY_ID.get(id);
}

// Deals each reviewer a different order inside each priority band.
//
// Nothing locks an item while someone looks at it — a lock that has to survive a
// closed laptop is a scheduler, and this is meant to be something you pick up
// for ten minutes. Instead the primary key makes a double review impossible, and
// this makes it unlikely: two people working at the same time are handed
// different items from the same band rather than both landing on item one.
export function dealFor(reviewerId: string, items: VerifyItem[]): VerifyItem[] {
  return [...items].sort(
    (a, b) => a.priority - b.priority || hash(reviewerId + a.id) - hash(reviewerId + b.id),
  );
}

function hash(input: string): number {
  let value = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    value ^= input.charCodeAt(i);
    value = Math.imul(value, 0x01000193);
  }
  return value >>> 0;
}
