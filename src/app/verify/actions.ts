"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServer } from "@/lib/supabase/server";
import { requireStaff, requireTeam } from "@/lib/auth";
import { verifyItem } from "@/lib/verify-items";

export type VerifyResult =
  | { ok: true }
  | { taken: true }
  | { error: string };

export async function submitVerification(
  itemId: string,
  verdict: "approved" | "needs_work",
  comment: string,
): Promise<VerifyResult> {
  const member = await requireTeam(undefined, "/verify");

  const item = verifyItem(itemId);
  if (!item) return { error: "That item is not in the checklist." };

  const note = comment.trim();
  if (verdict === "needs_work" && note.length < 3) {
    return { error: "Say what is wrong with it — one line is enough." };
  }

  const sb = await getSupabaseServer();
  if (!sb) return { error: "Offline demo, there is nowhere to save this." };

  const { error } = await sb.from("question_verifications").insert({
    item_id: itemId,
    kind: item.kind,
    verdict,
    comment: verdict === "needs_work" ? note : note || null,
    reviewed_by: member.id,
  });

  // 23505 is the primary key: somebody else reviewed this item while it was on
  // screen. Their review stands — the whole point is one review per item — so
  // this is a normal outcome, not a failure to report as one.
  if (error?.code === "23505") return { taken: true };
  if (error) return { error: error.message };

  revalidatePath("/verify");
  return { ok: true };
}

/** Put an item back in the queue — the normal move after fixing what was wrong. */
export async function reopenVerification(formData: FormData) {
  await requireStaff("/verify");
  const itemId = String(formData.get("item_id") ?? "");
  if (!itemId) return;

  const sb = await getSupabaseServer();
  if (!sb) return;

  await sb.from("question_verifications").delete().eq("item_id", itemId);
  revalidatePath("/verify");
}
