// Ticket vocabulary, shared by the server actions, the board, and the flag
// buttons scattered around the app.

export type TicketType = "bug" | "request" | "question";
export type TicketStatus =
  | "inbox"
  | "planned"
  | "building"
  | "done"
  | "declined"
  | "duplicate";
export type TicketPriority = "p0" | "p1" | "p2" | "p3";
export type TicketProblem =
  | "wrong_answer"
  | "bad_audio"
  | "poor_question"
  | "unclear"
  | "culturally_wrong"
  | "too_hard"
  | "too_easy"
  | "other";

export const TICKET_TYPES: Record<TicketType, { label: string; blurb: string }> = {
  bug: { label: "Bug", blurb: "Something in the app is broken" },
  request: { label: "Request", blurb: "A change or a new feature" },
  question: { label: "Flagged question", blurb: "A specific question is wrong" },
};

export const TICKET_STATUSES: Record<
  TicketStatus,
  { label: string; open: boolean }
> = {
  inbox: { label: "Inbox", open: true },
  planned: { label: "Planned", open: true },
  building: { label: "Building", open: true },
  done: { label: "Done", open: false },
  declined: { label: "Declined", open: false },
  duplicate: { label: "Duplicate", open: false },
};

// Statuses a ticket can be moved to, all of which require a written reason.
export const DECIDED_STATUSES: TicketStatus[] = [
  "planned",
  "building",
  "done",
  "declined",
  "duplicate",
];

export const PRIORITIES: Record<TicketPriority, { label: string; blurb: string }> = {
  p0: { label: "P0", blurb: "Workshop is blocked right now" },
  p1: { label: "P1", blurb: "Before the next workshop" },
  p2: { label: "P2", blurb: "Soon" },
  p3: { label: "P3", blurb: "Someday" },
};

// What can be wrong with a question. Written the way a native speaker would
// describe it, not the way a database would.
export const PROBLEMS: Record<TicketProblem, string> = {
  wrong_answer: "The marked answer is wrong",
  bad_audio: "Audio is wrong or badly pronounced",
  poor_question: "Weak question or unfair options",
  unclear: "Confusing — you can't tell what's being asked",
  culturally_wrong: "Not how it's actually said in Kazakh",
  too_hard: "Far too hard for the age group",
  too_easy: "Far too easy to teach anything",
  other: "Something else",
};

export type Ticket = {
  id: string;
  ref: string;
  type: TicketType;
  title: string;
  body: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  author_id: string | null;
  assignee_id: string | null;
  game_slug: string | null;
  item_id: string | null;
  problem: TicketProblem | null;
  decision_note: string | null;
  decided_by: string | null;
  decided_at: string | null;
  preview_url: string | null;
  linear_issue_id: string | null;
  linear_issue_url: string | null;
  votes: number;
  created_at: string;
};
