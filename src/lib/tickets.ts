// Ticket vocabulary, shared by the server actions, the board, and the flag
// buttons scattered around the app.

// Public URL for an image in the idea-attachments bucket (public, unlike
// kid-art). Attachment rows store the storage path, not the URL, for images.
export function ticketAttachmentUrl(storagePath: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/idea-attachments/${storagePath}`;
}

export type TicketType = "bug" | "request" | "question";
export type TicketStatus =
  | "inbox"
  | "planned"
  | "in_progress"
  | "needs_review"
  | "closed";
export type TicketResolution =
  | "implemented"
  | "declined"
  | "duplicate"
  | "cant_reproduce";
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
  in_progress: { label: "In progress", open: true },
  needs_review: { label: "Needs review", open: true },
  closed: { label: "Closed", open: false },
};

// Statuses a ticket can be moved to, all of which require a written reason.
export const DECIDED_STATUSES: TicketStatus[] = [
  "planned",
  "in_progress",
  "needs_review",
  "closed",
];

// A closed ticket always says how it was closed.
export const RESOLUTIONS: Record<TicketResolution, string> = {
  implemented: "Implemented",
  declined: "Not doing it",
  duplicate: "Duplicate",
  cant_reproduce: "Could not reproduce",
};

// What can be wrong with a question. Written the way a native speaker would
// describe it, not the way a database would.
export const PROBLEMS: Record<TicketProblem, string> = {
  wrong_answer: "The marked answer is wrong",
  bad_audio: "Audio is wrong or badly pronounced",
  poor_question: "Weak question or unfair options",
  unclear: "Confusing, you can't tell what's being asked",
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
  resolution: TicketResolution | null;
  urgent: boolean;
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
