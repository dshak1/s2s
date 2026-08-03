import { ChevronUp } from "lucide-react";
import { requireTeam, STAFF_ROLES, type TeamMember } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/supabase/server";
import { ticketAiReadiness } from "@/lib/ai/ticket-agent";
import { GAMES } from "@/content/games";
import { AdminShell, Empty, Panel } from "@/components/admin/shell";
import {
  PROBLEMS,
  RESOLUTIONS,
  TICKET_STATUSES,
  TICKET_TYPES,
  ticketAttachmentUrl,
  type Ticket,
  type TicketStatus,
  type TicketType,
} from "@/lib/tickets";
import { addComment, addLink, closeReview, toggleCommentLike, toggleVote } from "./actions";
import {
  ApproveAiRunForm,
  AiInvestigateButton,
  AiRunFeedbackForm,
  DecisionForm,
  EditTicketForm,
  NewTicketForm,
  RequestReviewForm,
} from "./forms";

export const metadata = { title: "Tickets · Steppe to Screen" };
export const dynamic = "force-dynamic";

type Comment = { id: string; ticket_id: string; author_id: string | null; body: string };
type Attachment = {
  id: string;
  ticket_id: string;
  kind: "image" | "link";
  storage_path: string | null;
  url: string | null;
  title: string | null;
};
type AiRun = {
  id: string;
  ticket_id: string;
  status: "queued" | "running" | "ready" | "preview_pending" | "needs_human" | "failed";
  branch_name: string | null;
  branch_url: string | null;
  commit_sha: string | null;
  preview_url: string | null;
  summary: string | null;
  error: string | null;
  created_at: string;
  finished_at: string | null;
};
type AiStep = {
  run_id: string;
  step_type: string;
  summary: string;
  created_at: string;
};
type AiArtifact = {
  run_id: string;
  kind: "case_file" | "screenshot" | "diff" | "deployment" | "branch" | "test_output" | "note";
  title: string;
  url: string | null;
  body: string | null;
};

const GAME_TITLES = new Map(GAMES.map((g) => [g.slug, g.title]));

const TYPE_STYLE: Record<TicketType, string> = {
  bug: "bg-[#fef2f2] text-[#b91c1c] border-[#fecaca]",
  request: "bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]",
  question: "bg-[#fefce8] text-[#a16207] border-[#fde68a]",
};

const STATUS_STYLE: Record<TicketStatus, string> = {
  inbox: "bg-[#f1f5f9] text-[#475569]",
  planned: "bg-[#eff6ff] text-[#1d4ed8]",
  in_progress: "bg-[#fefce8] text-[#a16207]",
  needs_review: "bg-[#faf5ff] text-[#7e22ce]",
  closed: "bg-[#f0fdf4] text-[#15803d]",
};

// A preview link only earns a button if it is actually a link. The old card
// rendered one for any non-empty value and shipped people to a 404.
function validUrl(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

const input =
  "w-full rounded-md border border-[#dbe0e6] bg-white px-2.5 py-1.5 text-[13px] outline-none transition focus:border-[#94a3b8]";
const chip = "rounded border px-1.5 py-0.5 text-[11px] font-medium";

const AI_STATUS_STYLE: Record<AiRun["status"], string> = {
  queued: "bg-[#f1f5f9] text-[#475569]",
  running: "bg-[#fefce8] text-[#a16207]",
  preview_pending: "bg-[#eff6ff] text-[#1d4ed8]",
  ready: "bg-[#f0fdf4] text-[#15803d]",
  needs_human: "bg-[#fff7ed] text-[#c2410c]",
  failed: "bg-[#fef2f2] text-[#b91c1c]",
};

function AiRunPanel({
  run,
  steps,
  artifacts,
  ticketId,
  canContinue,
  canApprove,
}: {
  run: AiRun;
  steps: AiStep[];
  artifacts: AiArtifact[];
  ticketId: string;
  canContinue: boolean;
  canApprove: boolean;
}) {
  const links = artifacts.filter((artifact) => artifact.url);
  const diff = artifacts.find((artifact) => artifact.kind === "diff" && artifact.body);
  const notes = artifacts.filter((artifact) => artifact.kind === "note" && artifact.body);
  const plan = notes.find((artifact) => artifact.title === "Plan");
  const uncertainty = notes.find((artifact) => artifact.title === "Uncertainty and confidence");
  const research = notes.find((artifact) => artifact.title === "Inspiration and research");
  const followUps = notes.find((artifact) => artifact.title === "Follow-up opportunities");
  const visibleNotes = [plan, uncertainty, research, followUps].filter(Boolean) as AiArtifact[];
  return (
    <div className="mt-2.5 rounded-md border border-[#dbe0e6] bg-[#f8fafc] px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wider text-[#64748b]">
            AI investigation
          </span>
          <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${AI_STATUS_STYLE[run.status]}`}>
            {run.status.replaceAll("_", " ")}
          </span>
          <span className="text-[11px] text-[#94a3b8]">
            {new Date(run.created_at).toLocaleString()}
          </span>
        </div>
        <a
          href={`/tickets/ai/${run.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md border border-[#cbd5e1] bg-white px-2 py-1 text-[12px] font-medium text-[#475569] hover:bg-[#f1f5f9]"
        >
          Open run
        </a>
      </div>
      {run.summary && <p className="mt-1.5 text-[13px] leading-relaxed">{run.summary}</p>}
      {run.error && <p className="mt-1.5 text-[13px] font-medium text-[#b91c1c]">{run.error}</p>}
      {visibleNotes.length > 0 && (
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          {visibleNotes.map((note) => (
            <details key={note.title} className="rounded border border-[#e2e8f0] bg-white px-2 py-1.5">
              <summary className="cursor-pointer text-[12px] font-medium text-[#0f172a]">
                {note.title}
              </summary>
              <pre className="mt-1 whitespace-pre-wrap text-[12px] leading-relaxed text-[#475569]">
                {note.body}
              </pre>
            </details>
          ))}
        </div>
      )}
      {steps.length > 0 && (
        <ol className="mt-2 space-y-1 border-t border-[#e2e8f0] pt-2">
          {steps.map((step) => (
            <li key={`${step.created_at}-${step.step_type}`} className="text-[12px] text-[#475569]">
              <span className="font-medium text-[#0f172a]">{step.step_type}</span>: {step.summary}
            </li>
          ))}
        </ol>
      )}
      {links.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {links.map((artifact) => (
            <a
              key={`${artifact.kind}-${artifact.title}`}
              href={artifact.url as string}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-[#cbd5e1] bg-white px-2 py-1 text-[12px] font-medium text-[#475569] hover:bg-[#f1f5f9]"
            >
              {artifact.title}
            </a>
          ))}
        </div>
      )}
      {canApprove && run.status === "ready" && (
        <div className="mt-2">
          <ApproveAiRunForm ticketId={ticketId} runId={run.id} />
        </div>
      )}
      {diff?.body && (
        <details className="mt-2">
          <summary className="cursor-pointer text-[12px] font-medium text-[#475569]">
            Proposed diff
          </summary>
          <pre className="mt-1 max-h-64 overflow-auto rounded bg-[#0f172a] p-2 text-[11px] leading-relaxed text-[#e2e8f0]">
            {diff.body}
          </pre>
        </details>
      )}
      {canContinue && run.status === "needs_human" && (
        <AiRunFeedbackForm ticketId={ticketId} runId={run.id} />
      )}
    </div>
  );
}

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; status?: string }>;
}) {
  const { type: typeFilter = "all", status: statusFilter = "open" } = await searchParams;
  const nextParams = new URLSearchParams();
  if (typeFilter !== "all") nextParams.set("type", typeFilter);
  if (statusFilter !== "open") nextParams.set("status", statusFilter);
  const member = await requireTeam(
    undefined,
    nextParams.size ? `/tickets?${nextParams.toString()}` : "/tickets",
  );
  const sb = await getSupabaseServer();
  const isStaff = STAFF_ROLES.includes(member.role);

  if (!sb) {
    return (
      <AdminShell member={member} current="/tickets" title="Tickets">
        <Empty>Offline demo mode, the ticket board needs Supabase.</Empty>
      </AdminShell>
    );
  }

  const readiness = ticketAiReadiness();
  const aiDisabledReason = readiness.enabled
    ? null
    : `Missing ${readiness.missing.join(", ")}`;

  const [ticketsRes, votesRes, commentsRes, attachmentsRes, teamRes, likesRes, reviewsRes, aiRunsRes] =
    await Promise.all([
    sb
      .from("tickets")
      .select("*")
      .order("votes", { ascending: false })
      .order("created_at", { ascending: false }),
    sb.from("ticket_votes").select("ticket_id").eq("voter_id", member.id),
    sb.from("ticket_comments").select("*").order("created_at", { ascending: true }),
    sb.from("ticket_attachments").select("*"),
    sb.from("team_members")
      .select("id, display_name, role")
      .in("role", ["member", "admin"]),
    sb.from("comment_likes").select("comment_id, member_id"),
    sb.from("ticket_reviews").select("*").is("closed_at", null),
    sb
      .from("ticket_ai_runs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const tickets = (ticketsRes.data ?? []) as Ticket[];
  const myVotes = new Set(
    ((votesRes.data ?? []) as Array<{ ticket_id: string }>).map((v) => v.ticket_id),
  );
  const comments = (commentsRes.data ?? []) as Comment[];
  const attachments = (attachmentsRes.data ?? []) as Attachment[];
  const aiRuns = (aiRunsRes.data ?? []) as AiRun[];
  const runIds = aiRuns.map((run) => run.id);
  const [aiStepsRes, aiArtifactsRes] =
    runIds.length > 0
      ? await Promise.all([
          sb
            .from("ticket_ai_steps")
            .select("run_id, step_type, summary, created_at")
            .in("run_id", runIds)
            .order("created_at", { ascending: true }),
          sb
            .from("ticket_ai_artifacts")
            .select("run_id, kind, title, url, body")
            .in("run_id", runIds)
            .order("created_at", { ascending: true }),
        ])
      : [{ data: [] }, { data: [] }];
  const aiSteps = (aiStepsRes.data ?? []) as AiStep[];
  const aiArtifacts = (aiArtifactsRes.data ?? []) as AiArtifact[];
  const latestAiRunByTicket = new Map<string, AiRun>();
  for (const run of aiRuns) {
    const current = latestAiRunByTicket.get(run.ticket_id);
    if (!current || (current.status === "failed" && run.status !== "failed")) {
      latestAiRunByTicket.set(run.ticket_id, run);
    }
  }
  const team = (teamRes.data ?? []) as Array<Pick<TeamMember, "id" | "display_name">>;
  const names = new Map(team.map((t) => [t.id, t.display_name]));

  const likeRows = (likesRes.data ?? []) as Array<{ comment_id: string; member_id: string }>;
  const likesByComment = new Map<string, number>();
  const myLikes = new Set<string>();
  for (const l of likeRows) {
    likesByComment.set(l.comment_id, (likesByComment.get(l.comment_id) ?? 0) + 1);
    if (l.member_id === member.id) myLikes.add(l.comment_id);
  }

  const openReviews = (reviewsRes.data ?? []) as Array<{
    id: string;
    ticket_id: string;
    requested_by: string | null;
    reviewer_id: string | null;
    note: string | null;
  }>;

  const visible = tickets.filter((t) => {
    const typeOk = typeFilter === "all" || t.type === typeFilter;
    const statusOk =
      statusFilter === "all"
        ? true
        : statusFilter === "open"
          ? TICKET_STATUSES[t.status].open
          : t.status === statusFilter;
    return typeOk && statusOk;
  });

  const counts = {
    bug: tickets.filter((t) => t.type === "bug" && TICKET_STATUSES[t.status].open).length,
    request: tickets.filter((t) => t.type === "request" && TICKET_STATUSES[t.status].open).length,
    question: tickets.filter((t) => t.type === "question" && TICKET_STATUSES[t.status].open).length,
  };

  const qs = (next: Record<string, string>) => {
    const p = new URLSearchParams({ type: typeFilter, status: statusFilter, ...next });
    return `/tickets?${p.toString()}`;
  };

  return (
    <AdminShell
      member={member}
      current="/tickets"
      title="Tickets"
      subtitle="Bugs, requests and flagged questions. Everything gets an answer."
      actions={
        <NewTicketForm games={GAMES.map((g) => ({ slug: g.slug, title: g.title }))} />
      }
    >
      {/* filters */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1">
          <span className="mr-1 text-[12px] text-[#94a3b8]">Type</span>
          {(["all", "bug", "request", "question"] as const).map((t) => (
            <a
              key={t}
              href={qs({ type: t })}
              className={`rounded-md px-2 py-1 text-[12px] transition ${
                typeFilter === t
                  ? "bg-[#0f172a] font-medium text-white"
                  : "text-[#475569] hover:bg-[#eef1f5]"
              }`}
            >
              {t === "all" ? "All" : TICKET_TYPES[t].label}
              {t !== "all" && counts[t] > 0 && (
                <span className="ml-1 opacity-60">{counts[t]}</span>
              )}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <span className="mr-1 text-[12px] text-[#94a3b8]">Status</span>
          {(["open", "inbox", "planned", "in_progress", "needs_review", "closed", "all"] as const).map(
            (s) => (
              <a
                key={s}
                href={qs({ status: s })}
                className={`whitespace-nowrap rounded-md px-2 py-1 text-[12px] transition ${
                  statusFilter === s
                    ? "bg-[#0f172a] font-medium text-white"
                    : "text-[#475569] hover:bg-[#eef1f5]"
                }`}
              >
                {s === "all" || s === "open" ? s : TICKET_STATUSES[s].label}
              </a>
            ),
          )}
        </div>
      </div>

      {visible.length === 0 ? (
        <Empty>Nothing here. File the first one.</Empty>
      ) : (
        <div className="space-y-2">
          {visible.map((t) => {
            const voted = myVotes.has(t.id);
            const mine = comments.filter((c) => c.ticket_id === t.id);
            const files = attachments.filter((a) => a.ticket_id === t.id);
            const aiRun = latestAiRunByTicket.get(t.id);
            const runSteps = aiRun ? aiSteps.filter((step) => step.run_id === aiRun.id) : [];
            const runArtifacts = aiRun
              ? aiArtifacts.filter((artifact) => artifact.run_id === aiRun.id)
              : [];

            return (
              <article
                key={t.id}
                className="rounded-lg border border-[#e2e5ea] bg-white p-3.5"
              >
                <div className="flex gap-3">
                  <form action={toggleVote}>
                    <input type="hidden" name="ticket_id" value={t.id} />
                    <input type="hidden" name="voted" value={voted ? "1" : "0"} />
                    <button
                      type="submit"
                      title={voted ? "Remove your vote" : "Vote"}
                      className={`flex w-10 flex-col items-center rounded-md border px-1 py-1.5 transition ${
                        voted
                          ? "border-[#0f172a] bg-[#0f172a] text-white"
                          : "border-[#dbe0e6] text-[#64748b] hover:bg-[#f1f3f6]"
                      }`}
                    >
                      <ChevronUp size={14} />
                      <span className="text-[12px] font-semibold tabular-nums">{t.votes}</span>
                    </button>
                  </form>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[12px] text-[#94a3b8]">{t.ref}</span>
                      <span className={`${chip} ${TYPE_STYLE[t.type]}`}>
                        {TICKET_TYPES[t.type].label}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${STATUS_STYLE[t.status]}`}
                      >
                        {TICKET_STATUSES[t.status].label}
                      </span>
                      {t.urgent && (
                        <span className="rounded bg-[#fef2f2] px-1.5 py-0.5 text-[11px] font-semibold text-[#b91c1c]">
                          Urgent
                        </span>
                      )}
                      {t.status === "closed" && t.resolution && (
                        <span className="text-[11px] text-[#94a3b8]">
                          {RESOLUTIONS[t.resolution]}
                        </span>
                      )}
                      {t.game_slug && (
                        <span className="text-[11px] text-[#94a3b8]">
                          {GAME_TITLES.get(t.game_slug) ?? t.game_slug}
                        </span>
                      )}
                    </div>

                    <h2 className="mt-1 text-[14px] font-semibold leading-snug">{t.title}</h2>
                    {t.body && (
                      <p className="mt-1 text-[13px] leading-relaxed text-[#475569]">{t.body}</p>
                    )}

                    {t.type === "question" && (
                      <p className="mt-1.5 text-[12px] text-[#64748b]">
                        <span className="font-mono text-[#94a3b8]">{t.item_id}</span>
                        {t.problem && `, ${PROBLEMS[t.problem]}`}
                      </p>
                    )}

                    <p className="mt-1.5 text-[11px] text-[#94a3b8]">
                      {t.author_id ? (names.get(t.author_id) ?? "Someone") : "Someone"} ·{" "}
                      {new Date(t.created_at).toLocaleDateString()}
                      {t.assignee_id && ` · assigned to ${names.get(t.assignee_id) ?? "?"}`}
                    </p>

                    {t.decision_note && (
                      <div className="mt-2.5 rounded-md border-l-2 border-[#0f172a] bg-[#f7f8fa] px-3 py-2">
                        <p className="text-[11px] font-medium uppercase tracking-wider text-[#94a3b8]">
                          Answer · {t.decided_by ? (names.get(t.decided_by) ?? "team") : "team"}
                          {t.decided_at && ` · ${new Date(t.decided_at).toLocaleDateString()}`}
                        </p>
                        <p className="mt-0.5 text-[13px] leading-relaxed">{t.decision_note}</p>
                      </div>
                    )}

                    {aiRun && (
                      <AiRunPanel
                        run={aiRun}
                        steps={runSteps}
                        artifacts={runArtifacts}
                        ticketId={t.id}
                        canContinue={isStaff && !aiDisabledReason}
                        canApprove={isStaff}
                      />
                    )}

                    {(t.status !== "inbox" || files.length > 0) && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {validUrl(t.preview_url) ? (
                          <a
                            href={validUrl(t.preview_url) as string}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-md border border-[#0f172a] px-2 py-1 text-[12px] font-medium hover:bg-[#f1f3f6]"
                          >
                            Try the draft ↗
                          </a>
                        ) : (
                          <span className="text-[12px] text-[#94a3b8]">No draft link yet</span>
                        )}
                        {files.map((f) =>
                          f.kind === "image" && f.storage_path ? (
                            <a
                              key={f.id}
                              href={ticketAttachmentUrl(f.storage_path)}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={f.title ?? "Screenshot"}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={ticketAttachmentUrl(f.storage_path)}
                                alt={f.title ?? "Screenshot"}
                                className="h-14 w-14 rounded-md border border-[#e2e5ea] object-cover"
                              />
                            </a>
                          ) : (
                            <a
                              key={f.id}
                              href={f.url ?? "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[12px] text-[#64748b] underline decoration-[#cbd5e1] hover:text-[#0f172a]"
                            >
                              {f.title ?? f.url}
                            </a>
                          ),
                        )}
                      </div>
                    )}

                    {openReviews
                      .filter((r) => r.ticket_id === t.id)
                      .map((r) => (
                        <div
                          key={r.id}
                          className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-md border border-[#e9d5ff] bg-[#faf5ff] px-3 py-2"
                        >
                          <span className="text-[12px] text-[#6b21a8]">
                            <strong>
                              {r.requested_by ? (names.get(r.requested_by) ?? "Someone") : "Someone"}
                            </strong>{" "}
                            asked{" "}
                            <strong>
                              {r.reviewer_id ? (names.get(r.reviewer_id) ?? "someone") : "someone"}
                            </strong>{" "}
                            to review
                            {r.note ? `: ${r.note}` : ""}
                          </span>
                          <form action={closeReview} className="flex items-center gap-1.5">
                            <input type="hidden" name="review_id" value={r.id} />
                            <select
                              name="outcome"
                              defaultValue="looks_good"
                              className="rounded border border-[#e9d5ff] bg-white px-1.5 py-1 text-[11px] outline-none"
                            >
                              <option value="looks_good">Looks good</option>
                              <option value="needs_work">Needs work</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                            <button
                              type="submit"
                              className="rounded-md bg-[#7e22ce] px-2.5 py-1 text-[11px] font-medium text-white transition hover:bg-[#6b21a8]"
                            >
                              Close review
                            </button>
                          </form>
                        </div>
                      ))}

                    {mine.length > 0 && (
                      <ul className="mt-2.5 space-y-1 border-t border-[#eef1f5] pt-2.5">
                        {mine.map((c) => {
                          const likes = likesByComment.get(c.id) ?? 0;
                          const iLiked = myLikes.has(c.id);
                          return (
                            <li key={c.id} className="flex items-start gap-2 text-[13px]">
                              <span className="min-w-0 flex-1">
                                <span className="font-medium">
                                  {c.author_id ? (names.get(c.author_id) ?? "Team") : "Team"}
                                </span>{" "}
                                <span className="text-[#475569]">{c.body}</span>
                              </span>
                              <form action={toggleCommentLike}>
                                <input type="hidden" name="comment_id" value={c.id} />
                                <input type="hidden" name="liked" value={iLiked ? "1" : "0"} />
                                <button
                                  type="submit"
                                  title={iLiked ? "Remove your like" : "Like"}
                                  className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] transition ${
                                    iLiked
                                      ? "bg-[#eef1f5] font-medium text-[#0f172a]"
                                      : "text-[#94a3b8] hover:bg-[#f1f3f6]"
                                  }`}
                                >
                                  Like{likes > 0 ? ` ${likes}` : ""}
                                </button>
                              </form>
                            </li>
                          );
                        })}
                      </ul>
                    )}

                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <form action={addComment} className="flex min-w-[15rem] flex-1 gap-1.5">
                        <input type="hidden" name="ticket_id" value={t.id} />
                        <input
                          name="body"
                          required
                          placeholder="Comment…"
                          className={input}
                        />
                        <button
                          type="submit"
                          className="rounded-md border border-[#dbe0e6] bg-white px-2.5 py-1.5 text-[12px] font-medium text-[#475569] hover:bg-[#f1f3f6]"
                        >
                          Post
                        </button>
                      </form>
                      <form action={addLink} className="flex min-w-[15rem] flex-1 gap-1.5">
                        <input type="hidden" name="ticket_id" value={t.id} />
                        <input
                          name="url"
                          required
                          placeholder="Link to something similar…"
                          className={input}
                        />
                        <button
                          type="submit"
                          className="rounded-md border border-[#dbe0e6] bg-white px-2.5 py-1.5 text-[12px] font-medium text-[#475569] hover:bg-[#f1f3f6]"
                        >
                          Add
                        </button>
                      </form>
                    </div>

                    <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-[#eef1f5] pt-2.5">
                      <EditTicketForm
                        ticketId={t.id}
                        title={t.title}
                        body={t.body}
                        type={t.type}
                        urgent={t.urgent}
                        assigneeId={t.assignee_id}
                        team={team}
                      />
                      <RequestReviewForm ticketId={t.id} team={team} />
                      {isStaff && (
                        <AiInvestigateButton
                          ticketId={t.id}
                          disabledReason={aiDisabledReason}
                        />
                      )}
                      {isStaff && (
                        <DecisionForm
                          ticketId={t.id}
                          currentStatus={t.status}
                          currentNote={t.decision_note}
                          currentResolution={t.resolution}
                          currentPreview={t.preview_url}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Panel className="mt-6">
        <p className="text-[12px] leading-relaxed text-[#64748b]">
          A ticket cannot leave the inbox without a written reason, that&apos;s a database
          constraint, not a team norm. Flagged questions carry the exact content id, so
          they line up with the labelling queue and the item analytics. AI investigations
          run on isolated branches and record their plan, assumptions, confidence, artifacts,
          and preview deployment for review.
        </p>
      </Panel>
    </AdminShell>
  );
}
