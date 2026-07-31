"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServer } from "@/lib/supabase/server";
import { requireStaff, type TeamRole } from "@/lib/auth";

const ROLES: TeamRole[] = [
  "admin",
  "dev",
  "educator",
  "native_speaker",
  "learner",
  "observer",
];

export async function setRole(formData: FormData) {
  await requireStaff("/admin/team");

  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "") as TeamRole;
  if (!id || !ROLES.includes(role)) return;

  const sb = await getSupabaseServer();
  if (!sb) return;

  await sb.from("team_members").update({ role }).eq("id", id);
  revalidatePath("/admin/team");
}
