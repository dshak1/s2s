"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServer } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { itemId, itemKey } from "@/lib/items";
import { CATEGORIES, VOCAB, type VocabCategory } from "@/content/vocab";

function slugify(en: string): string {
  return en.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "word";
}

/** Self-serve: inserts live immediately, no separate publish step. */
export async function addVocabWord(formData: FormData) {
  await requireStaff("/admin/vocab");

  const kk = String(formData.get("kk") ?? "").trim();
  const latin = String(formData.get("latin") ?? "").trim();
  const en = String(formData.get("en") ?? "").trim();
  const category = String(formData.get("category") ?? "") as VocabCategory;
  if (!kk || !en || !CATEGORIES.includes(category)) return;

  const sb = await getSupabaseServer();
  if (!sb) return;

  const { data: existing } = await sb.from("content_items").select("ref_slug").eq("kind", "vocab");
  const taken = new Set([
    ...VOCAB.map((v) => v.slug),
    ...((existing ?? []) as Array<{ ref_slug: string }>).map((r) => r.ref_slug),
  ]);

  const base = slugify(en);
  let slug = base;
  let suffix = 2;
  while (taken.has(slug)) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }

  await sb.from("content_items").insert({
    id: itemId("vocab", slug),
    item_key: itemKey("vocab", slug),
    kind: "vocab",
    ref_slug: slug,
    payload: { kk, latin: latin || kk, en, ru: en, category },
    source: "human",
    status: "live",
  });

  revalidatePath("/admin/vocab");
}
