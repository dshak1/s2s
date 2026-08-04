// Say & Shift's level system. Difficulty comes from each category's existing
// list order (no separate hand-ranking) and from widening the set of active
// categories — level is derived on the fly from vocabCorrect (already
// tracked in store.ts), never stored, so it's automatically consistent with
// the existing max-wins cross-device merge in hydrateFromServer.
//
// Every function here takes the vocab pool as an argument (rather than
// reading VOCAB directly) so it works the same whether the caller passes the
// static list or useVocab()'s VOCAB + instructor-added merge.
import { isVocabMastered, type Profile } from "@/lib/store";
import type { VocabCategory, VocabItem } from "@/content/vocab";

export const WORDS_PER_LEVEL = 6;
export const MAX_LEVEL = 4;

// Level 1 starts with the smallest, most foundational categories; each tier
// widens the set. The AI-drafted categories (weather/school/nature) unlock
// last, once the rest is mastered.
export const CATEGORY_TIERS: VocabCategory[][] = [
  ["numbers", "family", "greetings"],
  ["colors", "body"],
  ["animals", "places", "food"],
  ["weather", "school", "nature"],
];

// The level-1 categories gate overall progression — mastering them is what
// unlocks every later tier.
const CORE_CATEGORIES = CATEGORY_TIERS[0];

function byCategory(pool: VocabItem[], category: VocabCategory): VocabItem[] {
  return pool.filter((v) => v.category === category);
}

export function levelForCategory(profile: Profile, pool: VocabItem[], category: VocabCategory): number {
  const mastered = byCategory(pool, category).filter((v) => isVocabMastered(profile, v.slug)).length;
  return Math.min(MAX_LEVEL, 1 + Math.floor(mastered / WORDS_PER_LEVEL));
}

export function vocabAtLevel(pool: VocabItem[], category: VocabCategory, level: number): VocabItem[] {
  return byCategory(pool, category).slice(0, level * WORDS_PER_LEVEL);
}

// Overall run level: how far the kid has gotten through the core categories.
// Individual categories can still be ahead of this (their own vocabAtLevel
// widens independently as they're mastered), but this is what decides which
// tiers of categories are active at all.
export function currentLevel(profile: Profile, pool: VocabItem[]): number {
  return Math.max(1, ...CORE_CATEGORIES.map((cat) => levelForCategory(profile, pool, cat)));
}

export function activeCategories(level: number): VocabCategory[] {
  return CATEGORY_TIERS.slice(0, Math.min(level, CATEGORY_TIERS.length)).flat();
}

// Union pool for a run: each active category contributes only as many words
// as the kid has actually mastered in it (own per-category level), not the
// overall run level.
export function poolForLevel(profile: Profile, pool: VocabItem[], level: number): VocabItem[] {
  return activeCategories(level).flatMap((cat) =>
    vocabAtLevel(pool, cat, levelForCategory(profile, pool, cat)),
  );
}

// Walls scale gently with level so higher levels are also a longer run, not
// only harder words.
const WALLS_BY_LEVEL: Record<number, number> = { 1: 4, 2: 5, 3: 6, 4: 7 };

export function totalWallsForLevel(level: number): number {
  return WALLS_BY_LEVEL[Math.min(level, MAX_LEVEL)] ?? WALLS_BY_LEVEL[MAX_LEVEL];
}
