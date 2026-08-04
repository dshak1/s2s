"use client";

// Instructor-added vocab, on top of the static VOCAB array — see
// /admin/vocab and 0030_content_items_public_read.sql for the write/read
// path. Same "offline demo mode" contract as every other Supabase helper:
// fetchCustomVocab returns [] immediately when Supabase isn't configured.
import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { VOCAB, type VocabItem } from "@/content/vocab";

type ContentItemRow = {
  ref_slug: string;
  payload: { kk?: string; latin?: string; en?: string; ru?: string; category?: string };
};

export async function fetchCustomVocab(): Promise<VocabItem[]> {
  const sb = getSupabaseBrowser();
  if (!sb) return [];

  const { data } = await sb
    .from("content_items")
    .select("ref_slug, payload")
    .eq("kind", "vocab")
    .eq("status", "live");

  return ((data ?? []) as ContentItemRow[])
    .filter((row) => row.payload.kk && row.payload.en && row.payload.category)
    .map((row) => ({
      slug: row.ref_slug,
      kk: row.payload.kk!,
      latin: row.payload.latin || row.payload.kk!,
      en: row.payload.en!,
      ru: row.payload.ru || row.payload.en!,
      category: row.payload.category as VocabItem["category"],
    }));
}

// Fetched once per page load, shared across every useVocab() caller.
let cached: VocabItem[] | null = null;
let inFlight: Promise<VocabItem[]> | null = null;

/** Static VOCAB plus any live instructor-added words. */
export function useVocab(): VocabItem[] {
  const [custom, setCustom] = useState<VocabItem[]>(cached ?? []);

  useEffect(() => {
    if (cached) return;
    inFlight ??= fetchCustomVocab();
    inFlight.then((items) => {
      cached = items;
      setCustom(items);
    });
  }, []);

  if (custom.length === 0) return VOCAB;
  const staticSlugs = new Set(VOCAB.map((v) => v.slug));
  return [...VOCAB, ...custom.filter((v) => !staticSlugs.has(v.slug))];
}
