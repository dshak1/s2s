"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServer } from "@/lib/supabase/server";
import {
  EXPERTISE_LABELS,
  requireStaff,
  ROLE_LABELS,
  type Expertise,
  type TeamRole,
} from "@/lib/auth";

export async function setRole(formData: FormData) {
  await requireStaff("/admin/team");

  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "") as TeamRole;
  const expertise = String(formData.get("expertise") ?? "") as Expertise;
  if (!id || !(role in ROLE_LABELS)) return;

  const sb = await getSupabaseServer();
  if (!sb) return;

  await sb
    .from("team_members")
    .update({
      role,
      expertise: expertise in EXPERTISE_LABELS ? expertise : null,
    })
    .eq("id", id);

  revalidatePath("/admin/team");
}

/** One-click approve or decline from the waiting list. */
export async function approve(formData: FormData) {
  await requireStaff("/admin/team");

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const sb = await getSupabaseServer();
  if (!sb) return;

  await sb.from("team_members").update({ role: "member" }).eq("id", id);
  revalidatePath("/admin/team");
}

export async function decline(formData: FormData) {
  await requireStaff("/admin/team");

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const sb = await getSupabaseServer();
  if (!sb) return;

  // Not a delete: they would sign in again and land back in the queue. This
  // keeps the decision made.
  await sb.from("team_members").update({ role: "declined" }).eq("id", id);
  revalidatePath("/admin/team");
}
