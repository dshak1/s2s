"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServer } from "@/lib/supabase/server";
import { requireTeam, requireStaff } from "@/lib/auth";
import { createLinearIssue, linearEnabled } from "@/lib/linear";
import {
  DECIDED_STATUSES,
  PRIORITIES,
  PROBLEMS,
  TICKET_TYPES,
  type TicketPriority,
  type TicketProblem,
  type TicketStatus,
  type TicketType,
} from "@/lib/tickets";

export type ActionResult = { ok: boolean; error?: string; ref?: string };

function isType(v: string): v is TicketType {
  return v in TICKET_TYPES;
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
  const priority = String(formData.get("priority") ?? "p2");

  if (!isType(type)) return { ok: false, error: "Unknown ticket type." };
  if (title.length < 4) return { ok: false, error: "Give it a real title." };
  if (type === "question" && !itemId) {
    return { ok: false, error: "A flagged question needs the question it's about." };
  }
  if (problem && !(problem in PROBLEMS)) {
    return { ok: false, error: "Unknown problem." };
  }

  const { data, error } = await sb
    .from("tickets")
    .insert({
      type,
      title,
      body: body || null,
      priority: (priority in PRIORITIES ? priority : "p2") as TicketPriority,
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

/**
 * The response loop. A ticket cannot leave the inbox without a written reason —
 * enforced here and again by a CHECK constraint in 0015_tickets.sql.
 */
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
  const priority = String(formData.get("priority") ?? "p2");
  const previewUrl = String(formData.get("preview_url") ?? "").trim();
  const assignee = String(formData.get("assignee_id") ?? "").trim();

  if (!ticketId || !DECIDED_STATUSES.includes(status)) {
    return { ok: false, error: "Pick a status." };
  }
  if (note.length < 10) {
    return {
      ok: false,
      error: "Write the reason, at least a sentence. Whoever filed it sees this.",
    };
  }

  const { error } = await sb
    .from("tickets")
    .update({
      status,
      priority: (priority in PRIORITIES ? priority : "p2") as TicketPriority,
      decision_note: note,
      decided_by: member.id,
      decided_at: new Date().toISOString(),
      preview_url: previewUrl || null,
      assignee_id: assignee || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticketId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/tickets");
  revalidatePath("/dashboard");
  return { ok: true };
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
    .select("id, ref, type, title, body, decision_note, linear_issue_id, votes, item_id, problem")
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
