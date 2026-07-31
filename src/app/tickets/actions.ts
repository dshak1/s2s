"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServer } from "@/lib/supabase/server";
import { requireTeam, requireStaff, type TeamMember } from "@/lib/auth";
import { createLinearIssue, linearEnabled } from "@/lib/linear";
import {
  emailEnabled,
  reviewRequestEmail,
  sendEmail,
  ticketAnsweredEmail,
} from "@/lib/email";
import {
  DECIDED_STATUSES,
  PROBLEMS,
  RESOLUTIONS,
  TICKET_STATUSES,
  TICKET_TYPES,
  type TicketProblem,
  type TicketResolution,
  type TicketStatus,
  type TicketType,
} from "@/lib/tickets";

export type ActionResult = { ok: boolean; error?: string; ref?: string };

type SupabaseServer = NonNullable<Awaited<ReturnType<typeof getSupabaseServer>>>;

function isType(v: string): v is TicketType {
  return v in TICKET_TYPES;
}

/**
 * Record what changed and who changed it.
 *
 * Written from the action rather than a trigger so the actor is always known;
 * a trigger only sees the database role. Never blocks the write it describes.
 */
async function logEvents(
  sb: SupabaseServer,
  ticketId: string,
  actorId: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
) {
  const rows = Object.keys(after)
    .filter((k) => String(before[k] ?? "") !== String(after[k] ?? ""))
    .map((field) => ({
      ticket_id: ticketId,
      actor_id: actorId,
      field,
      old_value: before[field] == null ? null : String(before[field]),
      new_value: after[field] == null ? null : String(after[field]),
    }));

  if (rows.length > 0) await sb.from("ticket_events").insert(rows);
}

export async function createTicket(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const member = await requireTeam(undefined, "/tickets");
  const sb = await getSupabaseServer();
  if (!sb) return { ok: false, error: "Supabase is not configured." };

  const type = String(formData.get("type") ?? "request");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const gameSlug = String(formData.get("game_slug") ?? "").trim();
  const itemId = String(formData.get("item_id") ?? "").trim();
  const problem = String(formData.get("problem") ?? "").trim();
  const urgent = formData.get("urgent") === "on";

  if (!isType(type)) return { ok: false, error: "Unknown ticket type." };
  if (title.length < 4) return { ok: false, error: "Give it a real title." };
  if (type === "question" && !itemId && !gameSlug && !problem) {
    return {
      ok: false,
      error: "Say which game it was in, or what is wrong with it.",
    };
  }
  if (problem && !(problem in PROBLEMS)) return { ok: false, error: "Unknown problem." };

  const { data, error } = await sb
    .from("tickets")
    .insert({
      type,
      title,
      body: body || null,
      urgent,
      author_id: member.id,
      game_slug: gameSlug || null,
      item_id: itemId || null,
      problem: (problem || null) as TicketProblem | null,
      status: "inbox",
    })
    .select("id, ref")
    .single();

  if (error) return { ok: false, error: error.message };

  // Filing something is an implicit vote for it.
  await sb.from("ticket_votes").insert({ ticket_id: data.id, voter_id: member.id });

  revalidatePath("/tickets");
  revalidatePath("/dashboard");
  return { ok: true, ref: data.ref as string };
}

/**
 * Anyone on the team can edit any ticket. That was explicit: everyone is
 * trusted. Only the fields actually present in the form are written, so leaving
 * a box blank never clears a value someone else set.
 */
export async function editTicket(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const member = await requireTeam(undefined, "/tickets");
  const sb = await getSupabaseServer();
  if (!sb) return { ok: false, error: "Supabase is not configured." };

  const ticketId = String(formData.get("ticket_id") ?? "");
  if (!ticketId) return { ok: false, error: "Missing ticket." };

  const { data: before } = await sb
    .from("tickets")
    .select("title, body, type, urgent, assignee_id")
    .eq("id", ticketId)
    .maybeSingle();
  if (!before) return { ok: false, error: "Ticket not found." };

  const patch: Record<string, unknown> = {};

  if (formData.has("title")) {
    const title = String(formData.get("title") ?? "").trim();
    if (title.length < 4) return { ok: false, error: "Give it a real title." };
    patch.title = title;
  }
  if (formData.has("body")) {
    patch.body = String(formData.get("body") ?? "").trim() || null;
  }
  if (formData.has("type")) {
    const type = String(formData.get("type") ?? "");
    if (!isType(type)) return { ok: false, error: "Unknown ticket type." };
    patch.type = type;
  }
  if (formData.has("urgent_present")) {
    patch.urgent = formData.get("urgent") === "on";
  }
  if (formData.has("assignee_id")) {
    patch.assignee_id = String(formData.get("assignee_id") ?? "") || null;
  }

  if (Object.keys(patch).length === 0) return { ok: true };

  patch.updated_at = new Date().toISOString();
  const { error } = await sb.from("tickets").update(patch).eq("id", ticketId);
  if (error) return { ok: false, error: error.message };

  await logEvents(sb, ticketId, member.id, before, patch);

  revalidatePath("/tickets");
  return { ok: true };
}

export async function toggleVote(formData: FormData) {
  const member = await requireTeam(undefined, "/tickets");
  const sb = await getSupabaseServer();
  if (!sb) return;

  const ticketId = String(formData.get("ticket_id") ?? "");
  const voted = String(formData.get("voted") ?? "") === "1";
  if (!ticketId) return;

  if (voted) {
    await sb
      .from("ticket_votes")
      .delete()
      .eq("ticket_id", ticketId)
      .eq("voter_id", member.id);
  } else {
    await sb.from("ticket_votes").insert({ ticket_id: ticketId, voter_id: member.id });
  }

  revalidatePath("/tickets");
}

export async function addComment(formData: FormData) {
  const member = await requireTeam(undefined, "/tickets");
  const sb = await getSupabaseServer();
  if (!sb) return;

  const ticketId = String(formData.get("ticket_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!ticketId || !body) return;

  await sb
    .from("ticket_comments")
    .insert({ ticket_id: ticketId, author_id: member.id, body });
  revalidatePath("/tickets");
}

export async function toggleCommentLike(formData: FormData) {
  const member = await requireTeam(undefined, "/tickets");
  const sb = await getSupabaseServer();
  if (!sb) return;

  const commentId = String(formData.get("comment_id") ?? "");
  const liked = String(formData.get("liked") ?? "") === "1";
  if (!commentId) return;

  if (liked) {
    await sb
      .from("comment_likes")
      .delete()
      .eq("comment_id", commentId)
      .eq("member_id", member.id);
  } else {
    await sb.from("comment_likes").insert({ comment_id: commentId, member_id: member.id });
  }

  revalidatePath("/tickets");
}

export async function addLink(formData: FormData) {
  const member = await requireTeam(undefined, "/tickets");
  const sb = await getSupabaseServer();
  if (!sb) return;

  const ticketId = String(formData.get("ticket_id") ?? "");
  const raw = String(formData.get("url") ?? "").trim();
  if (!ticketId || !raw) return;

  let url: URL;
  try {
    url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch {
    return;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  await sb.from("ticket_attachments").insert({
    ticket_id: ticketId,
    author_id: member.id,
    kind: "link",
    url: url.toString(),
    title: String(formData.get("title") ?? "").trim() || url.hostname,
  });

  revalidatePath("/tickets");
}

/** The response loop: leaving the inbox costs a written reason. */
export async function decideTicket(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const member = await requireStaff("/tickets");
  const sb = await getSupabaseServer();
  if (!sb) return { ok: false, error: "Supabase is not configured." };

  const ticketId = String(formData.get("ticket_id") ?? "");
  const status = String(formData.get("status") ?? "") as TicketStatus;
  const note = String(formData.get("decision_note") ?? "").trim();
  const resolution = String(formData.get("resolution") ?? "") as TicketResolution;

  if (!ticketId || !DECIDED_STATUSES.includes(status)) {
    return { ok: false, error: "Pick a status." };
  }
  if (note.length < 10) {
    return {
      ok: false,
      error: "Write the reason, at least a sentence. Whoever filed it sees this.",
    };
  }
  if (status === "closed" && !(resolution in RESOLUTIONS)) {
    return { ok: false, error: "Say how it was closed." };
  }

  const { data: before } = await sb
    .from("tickets")
    .select("status, resolution, decision_note, ref, title, author_id")
    .eq("id", ticketId)
    .maybeSingle();
  if (!before) return { ok: false, error: "Ticket not found." };

  // Only these fields. A blank preview box no longer wipes a stored link, which
  // is the bug that made the old form lose data.
  const patch: Record<string, unknown> = {
    status,
    resolution: status === "closed" ? resolution : null,
    decision_note: note,
    decided_by: member.id,
    decided_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const previewRaw = String(formData.get("preview_url") ?? "").trim();
  if (formData.has("preview_url") && previewRaw) patch.preview_url = previewRaw;

  const { error } = await sb.from("tickets").update(patch).eq("id", ticketId);
  if (error) return { ok: false, error: error.message };

  await logEvents(sb, ticketId, member.id, before, patch);
  await notifyAuthor(sb, before, member, status, note);

  revalidatePath("/tickets");
  revalidatePath("/dashboard");
  return { ok: true };
}

async function notifyAuthor(
  sb: SupabaseServer,
  ticket: { ref: string; title: string; author_id: string | null },
  decider: TeamMember,
  status: TicketStatus,
  note: string,
) {
  if (!emailEnabled() || !ticket.author_id || ticket.author_id === decider.id) return;

  const { data: author } = await sb
    .from("team_members")
    .select("email")
    .eq("id", ticket.author_id)
    .maybeSingle();
  if (!author?.email) return;

  const mail = ticketAnsweredEmail({
    ref: ticket.ref,
    title: ticket.title,
    status: TICKET_STATUSES[status].label,
    note,
    deciderName: decider.display_name,
  });
  await sendEmail({ to: author.email as string, ...mail, replyTo: decider.email });
}

/** Ask a named person to look at a ticket. Stays open until someone closes it. */
export async function requestReview(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const member = await requireTeam(undefined, "/tickets");
  const sb = await getSupabaseServer();
  if (!sb) return { ok: false, error: "Supabase is not configured." };

  const ticketId = String(formData.get("ticket_id") ?? "");
  const reviewerId = String(formData.get("reviewer_id") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!ticketId || !reviewerId) return { ok: false, error: "Pick who should look." };

  const [{ data: ticket }, { data: reviewer }] = await Promise.all([
    sb.from("tickets").select("ref, title, status").eq("id", ticketId).maybeSingle(),
    sb.from("team_members").select("email, display_name").eq("id", reviewerId).maybeSingle(),
  ]);
  if (!ticket || !reviewer) return { ok: false, error: "Ticket or reviewer not found." };

  const { error } = await sb.from("ticket_reviews").insert({
    ticket_id: ticketId,
    requested_by: member.id,
    reviewer_id: reviewerId,
    note: note || null,
  });
  if (error) return { ok: false, error: error.message };

  await sb
    .from("tickets")
    .update({ status: "needs_review", updated_at: new Date().toISOString() })
    .eq("id", ticketId)
    .neq("status", "inbox");

  if (emailEnabled() && reviewer.email) {
    const mail = reviewRequestEmail({
      ref: ticket.ref as string,
      title: ticket.title as string,
      requesterName: member.display_name,
      note,
    });
    const sent = await sendEmail({
      to: reviewer.email as string,
      ...mail,
      replyTo: member.email,
    });
    if (!sent.ok) {
      revalidatePath("/tickets");
      return {
        ok: true,
        error: `Review requested, but the email did not send. ${sent.error ?? ""}`,
      };
    }
  }

  revalidatePath("/tickets");
  return { ok: true };
}

/** Anyone can close a review, not only the person asked. Both names are kept. */
export async function closeReview(formData: FormData) {
  const member = await requireTeam(undefined, "/tickets");
  const sb = await getSupabaseServer();
  if (!sb) return;

  const reviewId = String(formData.get("review_id") ?? "");
  const outcome = String(formData.get("outcome") ?? "looks_good");
  if (!reviewId) return;

  await sb
    .from("ticket_reviews")
    .update({
      closed_by: member.id,
      closed_at: new Date().toISOString(),
      outcome: ["looks_good", "needs_work", "cancelled"].includes(outcome)
        ? outcome
        : "looks_good",
    })
    .eq("id", reviewId);

  revalidatePath("/tickets");
}

export async function pushToLinear(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireStaff("/tickets");
  const sb = await getSupabaseServer();
  if (!sb) return { ok: false, error: "Supabase is not configured." };
  if (!linearEnabled()) {
    return { ok: false, error: "Set LINEAR_API_KEY to push tickets to Linear." };
  }

  const ticketId = String(formData.get("ticket_id") ?? "");
  if (!ticketId) return { ok: false, error: "Missing ticket." };

  const { data: ticket } = await sb
    .from("tickets")
    .select("id, ref, title, body, decision_note, linear_issue_id, votes, item_id, problem")
    .eq("id", ticketId)
    .maybeSingle();

  if (!ticket) return { ok: false, error: "Ticket not found." };
  if (ticket.linear_issue_id) return { ok: false, error: "Already on Linear." };

  const description = [
    ticket.body ?? "",
    "",
    ticket.item_id ? `Question: \`${ticket.item_id}\`` : "",
    ticket.problem ? `Problem: ${PROBLEMS[ticket.problem as TicketProblem]}` : "",
    `${ticket.votes} vote${ticket.votes === 1 ? "" : "s"}`,
    ticket.decision_note ? `\nDecision: ${ticket.decision_note}` : "",
    `\n_${ticket.ref}, filed from the Steppe to Screen ticket board._`,
  ]
    .filter(Boolean)
    .join("\n")
    .trim();

  try {
    const issue = await createLinearIssue({
      title: `${ticket.ref} ${ticket.title}`,
      description,
    });
    if (!issue) return { ok: false, error: "Linear did not create the issue." };

    await sb
      .from("tickets")
      .update({ linear_issue_id: issue.id, linear_issue_url: issue.url })
      .eq("id", ticketId);

    revalidatePath("/tickets");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Linear request failed.",
    };
  }
}
