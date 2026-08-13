"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServer } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";

/** Staff-seeded character — a Canva export with the background already
 * stripped, going straight to 'live' since a staff member is uploading it
 * directly (no review queue for your own uploads). */
export async function seedCharacter(formData: FormData) {
  const me = await requireStaff("/admin/characters");

  const file = formData.get("image");
  const displayName = String(formData.get("display_name") ?? "").trim() || "Steppe to Screen";
  if (!(file instanceof File) || file.size === 0) return;

  const sb = await getSupabaseServer();
  if (!sb) return;

  const id = crypto.randomUUID();
  const ext = file.type.split("/")[1]?.split("+")[0] || "png";
  const path = `shared/${id}.${ext}`;
  const buf = await file.arrayBuffer();

  const { error: uploadError } = await sb.storage.from("kid-art").upload(path, buf, { contentType: file.type || "image/png" });
  if (uploadError) return;

  await sb.from("shared_characters").insert({
    id,
    profile_id: null,
    display_name: displayName,
    storage_path: path,
    status: "live",
    source: "staff",
    decided_at: new Date().toISOString(),
    decided_by: me.id,
  });

  revalidatePath("/admin/characters");
}

export async function approveCharacter(formData: FormData) {
  const me = await requireStaff("/admin/characters");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const sb = await getSupabaseServer();
  if (!sb) return;

  await sb
    .from("shared_characters")
    .update({ status: "live", decided_at: new Date().toISOString(), decided_by: me.id })
    .eq("id", id);

  revalidatePath("/admin/characters");
}

export async function declineCharacter(formData: FormData) {
  const me = await requireStaff("/admin/characters");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const sb = await getSupabaseServer();
  if (!sb) return;

  await sb
    .from("shared_characters")
    .update({ status: "declined", decided_at: new Date().toISOString(), decided_by: me.id })
    .eq("id", id);

  revalidatePath("/admin/characters");
}
