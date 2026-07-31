"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServer } from "@/lib/supabase/server";
import { requireTeam } from "@/lib/auth";

// itemId comes back so the UI can tell "saved" apart from "saved something
// else a moment ago" without reaching for an effect.
export type LabelResult = { ok: boolean; error?: string; itemId?: string };

const AXES = [
  "clarity",
  "difficulty",
  "cultural_accuracy",
  "answer_correct",
  "distractor_quality",
] as const;

const VERDICTS = ["good", "bad", "unsure"];

export async function saveLabel(
  _prev: LabelResult,
  formData: FormData,
): Promise<LabelResult> {
  const member = await requireTeam(undefined, "/label");
  const sb = await getSupabaseServer();
  if (!sb) return { ok: false, error: "Supabase is not configured." };

  const itemId = String(formData.get("item_id") ?? "");
  const verdict = String(formData.get("verdict") ?? "");
  const reason = String(formData.get("reason_text") ?? "").trim();
  const taskId = String(formData.get("task_id") ?? "") || null;
  const voicePath = String(formData.get("voice_path") ?? "") || null;
  const transcript = String(formData.get("transcript") ?? "").trim() || null;

  if (!itemId) return { ok: false, error: "Missing item." };
  if (!VERDICTS.includes(verdict)) return { ok: false, error: "Pick a verdict." };
  if (verdict === "bad" && reason.length < 3) {
    return {
      ok: false,
      error: "Say what's wrong with it — a rejection without a reason can't be acted on.",
    };
  }

  const axes: Record<string, number> = {};
  for (const axis of AXES) {
    const raw = formData.get(axis);
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 1 && n <= 5) axes[axis] = n;
  }

  const msSpent = Number(formData.get("ms_spent"));
  const confidence = Number(formData.get("rater_confidence"));

  const { error } = await sb.from("labels").upsert(
    {
      item_id: itemId,
      rater_id: member.id,
      task_id: taskId,
      verdict,
      axes,
      reason_text: reason || null,
      voice_path: voicePath,
      transcript,
      rater_confidence: Number.isFinite(confidence) ? confidence : null,
      ms_spent: Number.isFinite(msSpent) ? msSpent : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "item_id,rater_id" },
  );

  if (error) return { ok: false, error: error.message };

  if (taskId) {
    await sb.from("label_tasks").update({ status: "done" }).eq("id", taskId);
  }

  revalidatePath("/label");
  return { ok: true, itemId };
}

/** Let the learner data nominate its own bad questions. */
export async function refreshAnalyticsTasks(): Promise<void> {
  await requireTeam(undefined, "/label");
  const sb = await getSupabaseServer();
  if (!sb) return;
  await sb.rpc("refresh_analytics_label_tasks", { min_attempts: 5 });
  revalidatePath("/label");
}
