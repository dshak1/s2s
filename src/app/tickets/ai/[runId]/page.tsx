import { requireTeam, STAFF_ROLES, type TeamMember } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/supabase/server";
import { ticketAiReadiness } from "@/lib/ai/ticket-agent";
import { AdminShell, Empty, Panel } from "@/components/admin/shell";
import { AiRunFeedbackForm, ApproveAiRunForm } from "../../forms";

export const metadata = { title: "AI ticket run · Steppe to Screen" };
export const dynamic = "force-dynamic";

type Run = {
  id: string;
  ticket_id: string;
  status: string;
  branch_name: string | null;
  branch_url: string | null;
  commit_sha: string | null;
  preview_url: string | null;
  summary: string | null;
  error: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
};

type Ticket = {
  id: string;
  ref: string;
  title: string;
  type: string;
  status: string;
  body: string | null;
};

type Step = {
  id: string;
  step_type: string;
  summary: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

type Artifact = {
  id: string;
  kind: string;
  title: string;
  url: string | null;
  body: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

const statusStyle: Record<string, string> = {
  queued: "bg-[#f1f5f9] text-[#475569]",
  running: "bg-[#fefce8] text-[#a16207]",
  preview_pending: "bg-[#eff6ff] text-[#1d4ed8]",
  ready: "bg-[#f0fdf4] text-[#15803d]",
  needs_human: "bg-[#fff7ed] text-[#c2410c]",
  failed: "bg-[#fef2f2] text-[#b91c1c]",
};

function JsonBlock({ value }: { value: Record<string, unknown> }) {
  if (!Object.keys(value).length) return null;
  return (
    <pre className="mt-1 max-h-44 overflow-auto rounded bg-[#f8fafc] p-2 text-[11px] leading-relaxed text-[#64748b]">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function LinkButton({ href, children }: { href: string | null; children: React.ReactNode }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-md border border-[#cbd5e1] bg-white px-2 py-1 text-[12px] font-medium text-[#475569] hover:bg-[#f1f5f9]"
    >
      {children}
    </a>
  );
}

export default async function AiRunPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  const member = await requireTeam(undefined, `/tickets/ai/${runId}`);
  const sb = await getSupabaseServer();
  if (!sb) {
    return (
      <AdminShell member={member} current="/tickets" title="AI run">
        <Empty>Supabase is not configured.</Empty>
      </AdminShell>
    );
  }

  const { data: run } = await sb
    .from("ticket_ai_runs")
    .select("*")
    .eq("id", runId)
    .maybeSingle();

  if (!run) {
    return (
      <AdminShell member={member} current="/tickets" title="AI run">
        <Empty>Run not found.</Empty>
      </AdminShell>
    );
  }

  const [{ data: ticket }, { data: steps }, { data: artifacts }] = await Promise.all([
    sb
      .from("tickets")
      .select("id, ref, title, type, status, body")
      .eq("id", (run as Run).ticket_id)
      .maybeSingle(),
    sb
      .from("ticket_ai_steps")
      .select("id, step_type, summary, metadata, created_at")
      .eq("run_id", runId)
      .order("created_at", { ascending: true }),
    sb
      .from("ticket_ai_artifacts")
      .select("id, kind, title, url, body, metadata, created_at")
      .eq("run_id", runId)
      .order("created_at", { ascending: true }),
  ]);

  const currentRun = run as Run;
  const currentTicket = ticket as Ticket | null;
  const runSteps = (steps ?? []) as Step[];
  const runArtifacts = (artifacts ?? []) as Artifact[];
  const notes = runArtifacts.filter((artifact) => artifact.kind === "note");
  const links = runArtifacts.filter((artifact) => artifact.url);
  const diffs = runArtifacts.filter((artifact) => artifact.kind === "diff" && artifact.body);
  const readiness = ticketAiReadiness();
  const canContinue = Boolean(
    currentTicket &&
    currentRun.status === "needs_human" &&
    STAFF_ROLES.includes(member.role) &&
    readiness.enabled,
  );
  const canApprove = Boolean(
    currentTicket &&
    currentRun.status === "ready" &&
    STAFF_ROLES.includes(member.role),
  );

  return (
    <AdminShell
      member={member as TeamMember}
      current="/tickets"
      title={currentTicket ? `${currentTicket.ref} AI run` : "AI run"}
      subtitle={currentTicket?.title ?? currentRun.id}
      actions={
        <div className="flex flex-wrap gap-2">
          <LinkButton href={currentRun.preview_url}>Preview</LinkButton>
          <LinkButton href={currentRun.branch_url}>Branch</LinkButton>
          {currentTicket && (
            <a
              href={`/tickets?type=${currentTicket.type}&status=${currentTicket.status}`}
              className="rounded-md border border-[#cbd5e1] bg-white px-2 py-1 text-[12px] font-medium text-[#475569] hover:bg-[#f1f5f9]"
            >
              Back to ticket
            </a>
          )}
        </div>
      }
    >
      <Panel>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded px-2 py-1 text-[12px] font-medium ${statusStyle[currentRun.status] ?? statusStyle.queued}`}>
            {currentRun.status.replaceAll("_", " ")}
          </span>
          <span className="text-[12px] text-[#94a3b8]">
            Started {currentRun.started_at ? new Date(currentRun.started_at).toLocaleString() : "not yet"}
          </span>
          {currentRun.finished_at && (
            <span className="text-[12px] text-[#94a3b8]">
              Finished {new Date(currentRun.finished_at).toLocaleString()}
            </span>
          )}
        </div>
        {currentRun.summary && (
          <p className="mt-3 text-[13px] leading-relaxed text-[#334155]">{currentRun.summary}</p>
        )}
        {currentRun.error && (
          <p className="mt-3 text-[13px] font-medium text-[#b91c1c]">{currentRun.error}</p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {links.map((artifact) => (
            <LinkButton key={artifact.id} href={artifact.url}>
              {artifact.title}
            </LinkButton>
          ))}
        </div>
        {canContinue && currentTicket && (
          <AiRunFeedbackForm ticketId={currentTicket.id} runId={currentRun.id} />
        )}
        {canApprove && currentTicket && (
          <div className="mt-3">
            <ApproveAiRunForm ticketId={currentTicket.id} runId={currentRun.id} />
          </div>
        )}
        {currentRun.status === "needs_human" && STAFF_ROLES.includes(member.role) && !readiness.enabled && (
          <p className="mt-3 text-[12px] font-medium text-[#dc2626]">
            Cannot continue yet. Missing {readiness.missing.join(", ")}.
          </p>
        )}
      </Panel>

      {notes.length > 0 && (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {notes.map((artifact) => (
            <Panel key={artifact.id}>
              <p className="text-[12px] font-semibold uppercase tracking-wider text-[#64748b]">
                {artifact.title}
              </p>
              <pre className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-[#334155]">
                {artifact.body}
              </pre>
              <JsonBlock value={artifact.metadata} />
            </Panel>
          ))}
        </div>
      )}

      <Panel className="mt-4">
        <p className="text-[12px] font-semibold uppercase tracking-wider text-[#64748b]">
          Stage log
        </p>
        <ol className="mt-3 space-y-2">
          {runSteps.map((step) => (
            <li key={step.id} className="rounded-md border border-[#e2e8f0] bg-white px-3 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[12px] text-[#94a3b8]">
                  {new Date(step.created_at).toLocaleTimeString()}
                </span>
                <span className="rounded bg-[#f1f5f9] px-1.5 py-0.5 text-[11px] font-medium text-[#475569]">
                  {step.step_type}
                </span>
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-[#334155]">{step.summary}</p>
              <JsonBlock value={step.metadata} />
            </li>
          ))}
        </ol>
      </Panel>

      {diffs.map((artifact) => (
        <Panel key={artifact.id} className="mt-4">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-[#64748b]">
            {artifact.title}
          </p>
          <pre className="mt-2 max-h-[32rem] overflow-auto rounded bg-[#0f172a] p-3 text-[11px] leading-relaxed text-[#e2e8f0]">
            {artifact.body}
          </pre>
        </Panel>
      ))}
    </AdminShell>
  );
}
