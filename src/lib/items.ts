// Stable ids for every question the games can ask.
//
// Ids are derived from content, never generated, so a client can compute one
// offline with zero round trips and telemetry logged in a gym with no Wi-Fi
// still joins cleanly to content_items later. Format: `<kind>:<ref_slug>:v<n>`.
//
// The rows in content_items are produced from the same TS content by
// scripts/gen-items.mjs, which imports these helpers so the two can't drift.

import type { VocabItem } from "@/content/vocab";
import type { Greeting } from "@/content/greetings";
import type { Letter } from "@/content/alphabet";
import type { Phrase } from "@/content/phrases";
import type { Region } from "@/content/regions";

export type ItemKind =
  | "vocab"
  | "letter"
  | "greeting"
  | "phrase"
  | "place"
  | "generated";

export const CURRENT_VERSION = 1;

export function itemKey(kind: ItemKind, refSlug: string): string {
  return `${kind}:${refSlug}`;
}

export function itemId(
  kind: ItemKind,
  refSlug: string,
  version: number = CURRENT_VERSION,
): string {
  return `${itemKey(kind, refSlug)}:v${version}`;
}

export function parseItemId(id: string): {
  kind: ItemKind;
  refSlug: string;
  version: number;
} | null {
  // ref_slug may itself contain ':' in theory, so split off the ends.
  const first = id.indexOf(":");
  const last = id.lastIndexOf(":");
  if (first < 0 || last <= first) return null;
  const version = Number(id.slice(last + 2));
  if (!Number.isFinite(version)) return null;
  return {
    kind: id.slice(0, first) as ItemKind,
    refSlug: id.slice(first + 1, last),
    version,
  };
}

// --- per-kind helpers -------------------------------------------------------
// Kazakh letters use the Cyrillic character itself as the slug ('letter:Ә:v1').
// It is unambiguous, readable in a SQL console, and avoids inventing a second
// transliteration scheme alongside the one in src/content/alphabet.ts.

// Callers pass structurally-compatible shapes (a few games define their own
// local view types over the same content), so these take the minimum field.
export const vocabItemId = (v: Pick<VocabItem, "slug">) => itemId("vocab", v.slug);
export const letterItemId = (l: Pick<Letter, "cyr"> | string) =>
  itemId("letter", typeof l === "string" ? l : l.cyr);
export const greetingItemId = (g: Pick<Greeting, "audio">) =>
  itemId("greeting", greetingSlug(g.audio));
export const phraseItemId = (p: Pick<Phrase, "kk">) => itemId("phrase", p.kk);
export const placeItemId = (r: { id: Region["id"] | string }) => itemId("place", r.id);

// '/audio/greetings/salem.mp3' -> 'salem'
export function greetingSlug(audioPath: string): string {
  return audioPath.split("/").pop()?.replace(/\.[a-z0-9]+$/i, "") ?? audioPath;
}
