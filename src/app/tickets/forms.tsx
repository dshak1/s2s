"use client";

import { useActionState, useState } from "react";
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
import {
  approveAiRun,
  createTicket,
  continueAiInvestigation,
  decideTicket,
  editTicket,
  requestReview,
  startAiInvestigation,
  type ActionResult,
} from "./actions";

const EMPTY: ActionResult = { ok: false };

export const input =
  "w-full rounded-md border border-[#dbe0e6] bg-white px-2.5 py-1.5 text-[13px] outline-none transition focus:border-[#94a3b8] focus:ring-2 focus:ring-[#e2e8f0]";
const label = "mb-1 block text-[12px] font-medium text-[#475569]";
const btn = "rounded-md px-3 py-1.5 text-[13px] font-medium transition disabled:opacity-50";
export const btnPrimary = `${btn} bg-[#0f172a] text-white hover:bg-[#1e293b]`;
export const btnGhost = `${btn} border border-[#dbe0e6] bg-white text-[#475569] hover:bg-[#f1f3f6]`;

type Member = { id: string; display_name: string };

/** Everything past the comment box — edit, review, AI investigate, the
 * status/decision form, "link to something similar" — collapsed behind one
 * toggle so a ticket's default view is just its comment box, not five forms
 * at once. */
export function MoreActions({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2.5 text-[12px] font-medium text-[#94a3b8] underline decoration-dotted hover:text-[#64748b]"
      >
        More actions…
      </button>
    );
  }

  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-[#eef1f5] pt-2.5">
      {children}
    </div>
  );
}

function UrgentToggle({ defaultChecked = false }: { defaultChecked?: boolean }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-1.5 text-[12px] font-medium text-[#475569]">
      <input type="hidden" name="urgent_present" value="1" />
      <input
        type="checkbox"
        name="urgent"
        defaultChecked={defaultChecked}
        className="h-3.5 w-3.5 accent-[#b91c1c]"
      />
      Mark urgent
    </label>
  );
}

export function NewTicketForm({
  games,
  presetItemId,
}: {
  games: Array<{ slug: string; title: string }>;
  presetItemId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<TicketType>(presetItemId ? "question" : "request");
  const [state, action, pending] = useActionState(createTicket, EMPTY);

  if (!open) {
    return (
      <button className={btnPrimary} onClick={() => setOpen(true)}>
        New ticket
      </button>
    );
  }

  if (state.ok) {
    return (
      <div className="w-full rounded-lg border border-[#e2e5ea] bg-white p-4">
        <p className="text-[13px] font-semibold">
          Filed as <span className="font-mono">{state.ref}</span>
        </p>
        <p className="mt-1 text-[12px] text-[#64748b]">
          It is in the inbox with your vote on it. An admin has to answer it.
        </p>
        <div className="mt-3 flex gap-2">
          <button className={btnPrimary} onClick={() => setOpen(true)}>
            File another
          </button>
          <button className={btnGhost} onClick={() => setOpen(false)}>
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="w-full rounded-lg border border-[#e2e5ea] bg-white p-4">
      <div className="mb-3 grid gap-2 sm:grid-cols-3">
        {(Object.keys(TICKET_TYPES) as TicketType[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`rounded-md border px-3 py-2 text-left transition ${
              type === t
                ? "border-[#0f172a] bg-[#0f172a] text-white"
                : "border-[#dbe0e6] bg-white hover:bg-[#f1f3f6]"
            }`}
          >
            <span className="block text-[13px] font-semibold">{TICKET_TYPES[t].label}</span>
            <span
              className={`block text-[11px] ${type === t ? "text-white/70" : "text-[#94a3b8]"}`}
            >
              {TICKET_TYPES[t].blurb}
            </span>
          </button>
        ))}
      </div>

      <input type="hidden" name="type" value={type} />
      {presetItemId && <input type="hidden" name="item_id" value={presetItemId} />}

      <div className="space-y-3">
        <div>
          <label className={label} htmlFor="t-title">
            Title
          </label>
          <input
            id="t-title"
            name="title"
            required
            placeholder={
              type === "bug"
                ? "What broke, and where?"
                : type === "question"
                  ? "Which question, and what is wrong with it?"
                  : "What should change?"
            }
            className={input}
          />
        </div>

        <div>
          <label className={label} htmlFor="t-body">
            Detail
          </label>
          <textarea
            id="t-body"
            name="body"
            rows={3}
            placeholder={
              type === "bug"
                ? "Steps to hit it, what you expected, what happened."
                : "How would it work? What made you think of it?"
            }
            className={`${input} resize-none`}
          />
        </div>

        {type === "question" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="t-problem">
                What is wrong
              </label>
              <select id="t-problem" name="problem" defaultValue="poor_question" className={input}>
                {(Object.keys(PROBLEMS) as TicketProblem[]).map((p) => (
                  <option key={p} value={p}>
                    {PROBLEMS[p]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="t-qgame">
                Which game
              </label>
              <select id="t-qgame" name="game_slug" defaultValue="" className={input}>
                <option value="">Not sure</option>
                {games.map((g) => (
                  <option key={g.slug} value={g.slug}>
                    {g.title}
                  </option>
                ))}
              </select>
            </div>
            {!presetItemId && (
              <div className="sm:col-span-2">
                <label className={label} htmlFor="t-item">
                  Question id (optional)
                </label>
                <input
                  id="t-item"
                  name="item_id"
                  placeholder="vocab:ake:v1"
                  className={`${input} font-mono`}
                />
                <p className="mt-1 text-[11px] text-[#94a3b8]">
                  Leave it blank if you do not know it. Flagging from the labelling
                  queue fills it in for you.
                </p>
              </div>
            )}
          </div>
        )}

        {type !== "question" && (
          <div>
            <label className={label} htmlFor="t-game">
              Game (optional)
            </label>
            <select id="t-game" name="game_slug" defaultValue="" className={input}>
              <option value="">Not game-specific</option>
              {games.map((g) => (
                <option key={g.slug} value={g.slug}>
                  {g.title}
                </option>
              ))}
            </select>
          </div>
        )}

        <UrgentToggle />

        {state.error && <p className="text-[12px] font-medium text-[#dc2626]">{state.error}</p>}

        <div className="flex gap-2">
          <button type="submit" disabled={pending} className={btnPrimary}>
            {pending ? "Filing…" : "File ticket"}
          </button>
          <button type="button" onClick={() => setOpen(false)} className={btnGhost}>
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}

/** Anyone on the team can edit any ticket. Every change is recorded. */
export function EditTicketForm({
  ticketId,
  title,
  body,
  type,
  urgent,
  assigneeId,
  team,
}: {
  ticketId: string;
  title: string;
  body: string | null;
  type: TicketType;
  urgent: boolean;
  assigneeId: string | null;
  team: Member[];
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(editTicket, EMPTY);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className={btnGhost}>
        Edit
      </button>
    );
  }

  return (
    <form action={action} className="mt-3 w-full rounded-md border border-[#e2e5ea] bg-[#f7f8fa] p-3">
      <input type="hidden" name="ticket_id" value={ticketId} />
      <input name="title" defaultValue={title} required className={`${input} mb-2`} />
      <textarea
        name="body"
        rows={3}
        defaultValue={body ?? ""}
        placeholder="Detail"
        className={`${input} mb-2 resize-none`}
      />
      <div className="mb-2 grid gap-2 sm:grid-cols-2">
        <select name="type" defaultValue={type} className={input}>
          {(Object.keys(TICKET_TYPES) as TicketType[]).map((t) => (
            <option key={t} value={t}>
              {TICKET_TYPES[t].label}
            </option>
          ))}
        </select>
        <select name="assignee_id" defaultValue={assigneeId ?? ""} className={input}>
          <option value="">Unassigned</option>
          {team.map((t) => (
            <option key={t.id} value={t.id}>
              {t.display_name}
            </option>
          ))}
        </select>
      </div>
      <div className="mb-2">
        <UrgentToggle defaultChecked={urgent} />
      </div>
      {state.error && <p className="mb-2 text-[12px] font-medium text-[#dc2626]">{state.error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={btnGhost}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export function DecisionForm({
  ticketId,
  currentStatus,
  currentNote,
  currentResolution,
  currentPreview,
}: {
  ticketId: string;
  currentStatus: TicketStatus;
  currentNote: string | null;
  currentResolution: TicketResolution | null;
  currentPreview: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<TicketStatus>(
    currentStatus === "inbox" ? "planned" : currentStatus,
  );
  const [state, action, pending] = useActionState(decideTicket, EMPTY);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className={btnPrimary}>
        {currentStatus === "inbox" ? "Respond" : "Update"}
      </button>
    );
  }

  return (
    <form action={action} className="mt-3 w-full rounded-md border border-[#e2e5ea] bg-[#f7f8fa] p-3">
      <input type="hidden" name="ticket_id" value={ticketId} />
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-[#94a3b8]">
        Whoever filed this reads your answer
      </p>

      <div className="mb-2 grid gap-2 sm:grid-cols-2">
        <select
          name="status"
          value={status}
          onChange={(e) => setStatus(e.target.value as TicketStatus)}
          className={input}
        >
          {DECIDED_STATUSES.map((s) => (
            <option key={s} value={s}>
              {TICKET_STATUSES[s].label}
            </option>
          ))}
        </select>
        {status === "closed" && (
          <select
            name="resolution"
            defaultValue={currentResolution ?? "implemented"}
            className={input}
          >
            {(Object.keys(RESOLUTIONS) as TicketResolution[]).map((r) => (
              <option key={r} value={r}>
                {RESOLUTIONS[r]}
              </option>
            ))}
          </select>
        )}
      </div>

      <textarea
        name="decision_note"
        rows={3}
        required
        defaultValue={currentNote ?? ""}
        placeholder="Why this call? If it is a no, what would change your mind?"
        className={`${input} mb-2 resize-none`}
      />
      <input
        name="preview_url"
        defaultValue={currentPreview ?? ""}
        placeholder="Draft link to try it (optional)"
        className={`${input} mb-2`}
      />
      <p className="mb-2 text-[11px] text-[#94a3b8]">
        Leaving the draft link blank keeps whatever is already there.
      </p>

      {state.error && <p className="mb-2 text-[12px] font-medium text-[#dc2626]">{state.error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={btnGhost}>
          Cancel
        </button>
      </div>
    </form>
  );
}

/** Ask a named person to look. They get an email; the request stays open. */
export function RequestReviewForm({
  ticketId,
  team,
}: {
  ticketId: string;
  team: Member[];
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(requestReview, EMPTY);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className={btnGhost}>
        Ask for review
      </button>
    );
  }

  return (
    <form action={action} className="mt-3 w-full rounded-md border border-[#e2e5ea] bg-[#f7f8fa] p-3">
      <input type="hidden" name="ticket_id" value={ticketId} />
      <div className="mb-2 grid gap-2 sm:grid-cols-2">
        <select name="reviewer_id" required defaultValue="" className={input}>
          <option value="" disabled>
            Who should look?
          </option>
          {team.map((t) => (
            <option key={t.id} value={t.id}>
              {t.display_name}
            </option>
          ))}
        </select>
        <input name="note" placeholder="What should they check?" className={input} />
      </div>
      {state.error && <p className="mb-2 text-[12px] font-medium text-[#dc2626]">{state.error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "Asking…" : "Send request"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={btnGhost}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export function AiInvestigateButton({
  ticketId,
  disabledReason,
}: {
  ticketId: string;
  disabledReason?: string | null;
}) {
  const [state, action, pending] = useActionState(startAiInvestigation, EMPTY);
  const disabled = pending || Boolean(disabledReason);
  return (
    <form action={action} className="inline-flex items-center gap-2">
      <input type="hidden" name="ticket_id" value={ticketId} />
      <button type="submit" disabled={disabled} className={btnGhost} title={disabledReason ?? "AI investigate"}>
        {pending ? "Starting AI…" : "AI investigate"}
      </button>
      {disabledReason && (
        <span className="text-[12px] font-medium text-[#dc2626]">{disabledReason}</span>
      )}
      {state.ok && (
        <span className="text-[12px] font-medium text-[#15803d]">AI run started.</span>
      )}
      {state.error && (
        <span className="text-[12px] font-medium text-[#dc2626]">{state.error}</span>
      )}
    </form>
  );
}

export function AiRunFeedbackForm({
  ticketId,
  runId,
}: {
  ticketId: string;
  runId: string;
}) {
  const [state, action, pending] = useActionState(continueAiInvestigation, EMPTY);

  return (
    <form action={action} className="mt-3 rounded-md border border-[#fed7aa] bg-white px-3 py-2.5">
      <input type="hidden" name="ticket_id" value={ticketId} />
      <input type="hidden" name="run_id" value={runId} />
      <label className="mb-1 block text-[12px] font-medium text-[#9a3412]" htmlFor={`ai-feedback-${runId}`}>
        Human feedback
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <textarea
          id={`ai-feedback-${runId}`}
          name="body"
          required
          rows={2}
          placeholder="Example: make it centered, solid green, and place it above the game cards."
          className={`${input} min-h-16 resize-none`}
        />
        <button type="submit" disabled={pending} className={`${btnPrimary} shrink-0 self-start`}>
          {pending ? "Continuing…" : "Send and continue"}
        </button>
      </div>
      {state.ok && (
        <p className="mt-2 text-[12px] font-medium text-[#15803d]">
          Feedback saved. Follow-up AI run started.
        </p>
      )}
      {state.error && (
        <p className="mt-2 text-[12px] font-medium text-[#dc2626]">{state.error}</p>
      )}
    </form>
  );
}

export function ApproveAiRunForm({
  ticketId,
  runId,
}: {
  ticketId: string;
  runId: string;
}) {
  const [state, action, pending] = useActionState(approveAiRun, EMPTY);

  return (
    <form action={action} className="inline-flex items-center gap-2">
      <input type="hidden" name="ticket_id" value={ticketId} />
      <input type="hidden" name="run_id" value={runId} />
      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? "Merging…" : "Approve and merge"}
      </button>
      {state.ok && (
        <span className="text-[12px] font-medium text-[#15803d]">
          Merge started.
        </span>
      )}
      {state.error && (
        <span className="text-[12px] font-medium text-[#dc2626]">{state.error}</span>
      )}
    </form>
  );
}
