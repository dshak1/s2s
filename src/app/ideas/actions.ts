"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServer } from "@/lib/supabase/server";
import { requireTeam, requireStaff } from "@/lib/auth";
import { createLinearIssue, linearEnabled } from "@/lib/linear";

const CATEGORIES = ["feature", "bug", "content", "ux"];
const DECIDED_STATUSES = ["planned", "building", "shipped", "wont-do"];

export type ActionResult = { ok: boolean; error?: string };

export async function submitIdea(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const member = await requireTeam(undefined, "/ideas");
  const sb = await getSupabaseServer();
  if (!sb) return { ok: false, error: "Supabase is not configured." };

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "feature");

  if (title.length < 4) return { ok: false, error: "Give the idea a real title." };
  if (!CATEGORIES.includes(category)) return { ok: false, error: "Unknown category." };

  const { data, error } = await sb
    .from("wishlist_items")
    .insert({
      title,
      description: description || null,
      category,
      submitted_by: member.display_name,
      author_id: member.id,
      status: "idea",
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  // The author's own vote is implicit — nobody submits an idea they're against.
  await sb.from("idea_votes").insert({ idea_id: data.id, voter_id: member.id });

  revalidatePath("/ideas");
  return { ok: true };
}

export async function toggleVote(formData: FormData) {
  const member = await requireTeam(undefined, "/ideas");
  const sb = await getSupabaseServer();
  if (!sb) return;

  const ideaId = String(formData.get("idea_id") ?? "");
  const voted = String(formData.get("voted") ?? "") === "1";
  if (!ideaId) return;

  if (voted) {
    await sb.from("idea_votes").delete().eq("idea_id", ideaId).eq("voter_id", member.id);
  } else {
    await sb.from("idea_votes").insert({ idea_id: ideaId, voter_id: member.id });
  }

  revalidatePath("/ideas");
}

export async function addComment(formData: FormData) {
  const member = await requireTeam(undefined, "/ideas");
  const sb = await getSupabaseServer();
  if (!sb) return;

  const ideaId = String(formData.get("idea_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!ideaId || !body) return;

  await sb.from("idea_comments").insert({ idea_id: ideaId, author_id: member.id, body });
  revalidatePath("/ideas");
}

export async function addLink(formData: FormData) {
  const member = await requireTeam(undefined, "/ideas");
  const sb = await getSupabaseServer();
  if (!sb) return;

  const ideaId = String(formData.get("idea_id") ?? "");
  const raw = String(formData.get("url") ?? "").trim();
  if (!ideaId || !raw) return;

  let url: URL;
  try {
    url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch {
    return;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  await sb.from("idea_attachments").insert({
    idea_id: ideaId,
    author_id: member.id,
    kind: "link",
    url: url.toString(),
    title: String(formData.get("title") ?? "").trim() || url.hostname,
  });

  revalidatePath("/ideas");
}

/**
 * The response loop. Moving an idea out of the inbox requires a written reason —
 * enforced here and again by a CHECK constraint in 0009_triage.sql, so there is
 * no code path that silently ignores someone's idea.
 */
export async function decideIdea(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const member = await requireStaff("/ideas");
  const sb = await getSupabaseServer();
  if (!sb) return { ok: false, error: "Supabase is not configured." };

  const ideaId = String(formData.get("idea_id") ?? "");
  const status = String(formData.get("status") ?? "");
  const note = String(formData.get("decision_note") ?? "").trim();
  const previewUrl = String(formData.get("preview_url") ?? "").trim();

  if (!ideaId || !DECIDED_STATUSES.includes(status)) {
    return { ok: false, error: "Pick a status." };
  }
  if (note.length < 10) {
    return {
      ok: false,
      error: "Write the reason — at least a sentence. The author sees this.",
    };
  }

  const { error } = await sb
    .from("wishlist_items")
    .update({
      status,
      decision_note: note,
      decided_by: member.id,
      decided_at: new Date().toISOString(),
      preview_url: previewUrl || null,
    })
    .eq("id", ideaId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/ideas");
  return { ok: true };
}

export async function pushToLinear(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireStaff("/ideas");
  const sb = await getSupabaseServer();
  if (!sb) return { ok: false, error: "Supabase is not configured." };
  if (!linearEnabled()) {
    return { ok: false, error: "Set LINEAR_API_KEY to push issues to Linear." };
  }

  const ideaId = String(formData.get("idea_id") ?? "");
  if (!ideaId) return { ok: false, error: "Missing idea." };

  const { data: idea } = await sb
    .from("wishlist_items")
    .select("id, title, description, submitted_by, decision_note, linear_issue_id, votes")
    .eq("id", ideaId)
    .maybeSingle();

  if (!idea) return { ok: false, error: "Idea not found." };
  if (idea.linear_issue_id) return { ok: false, error: "Already on Linear." };

  const description = [
    idea.description ?? "",
    "",
    `Proposed by **${idea.submitted_by}** · ${idea.votes} vote${idea.votes === 1 ? "" : "s"}`,
    idea.decision_note ? `\nDecision: ${idea.decision_note}` : "",
    "\n_Filed from the Steppe to Screen idea board._",
  ]
    .join("\n")
    .trim();

  try {
    const issue = await createLinearIssue({ title: idea.title, description });
    if (!issue) return { ok: false, error: "Linear did not create the issue." };

    await sb
      .from("wishlist_items")
      .update({ linear_issue_id: issue.id, linear_issue_url: issue.url })
      .eq("id", ideaId);

    revalidatePath("/ideas");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Linear request failed." };
  }
}
