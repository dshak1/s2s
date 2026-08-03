// Transactional email through Resend.
//
// Gated on RESEND_API_KEY and a no-op without it, the same contract as
// src/lib/linear.ts and the Supabase clients. Server only: the key must never
// reach the browser.
//
// Sent from server actions rather than database triggers, so there is always a
// session behind the send and a failure is visible to the person who caused it.

const API = "https://api.resend.com/emails";

// Until a domain is verified in Resend, this is the only address that can send,
// and it will only deliver to the Resend account owner. Set EMAIL_FROM once a
// real domain is verified.
const DEFAULT_FROM = "Steppe to Screen <onboarding@resend.dev>";

export function emailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export type SendResult = { ok: boolean; error?: string };

export async function sendEmail(input: {
  to: string;
  subject: string;
  body: string;
  replyTo?: string;
}): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: "email is off" };

  try {
    const res = await fetch(API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || DEFAULT_FROM,
        to: [input.to],
        subject: input.subject,
        text: input.body,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const detail = await res.text();
      return { ok: false, error: `Resend ${res.status}: ${detail.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "send failed" };
  }
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://s2s-ten.vercel.app";

export function reviewRequestEmail(input: {
  ref: string;
  title: string;
  requesterName: string;
  note?: string | null;
}) {
  return {
    subject: `${input.requesterName} asked you to look at ${input.ref}`,
    body: [
      `${input.requesterName} would like your eyes on a ticket.`,
      "",
      `${input.ref}  ${input.title}`,
      input.note ? `\nThey said: ${input.note}` : "",
      "",
      `Open it: ${APP_URL}/tickets`,
      "",
      "The review stays open until someone closes it.",
    ]
      .filter((line) => line !== "")
      .join("\n"),
  };
}

export function approvalWaitingEmail(input: { name: string; email: string }) {
  return {
    subject: `${input.name} is waiting for access`,
    body: [
      `${input.name} (${input.email}) signed in and is waiting for a role.`,
      "",
      `Approve or decline: ${APP_URL}/admin/team`,
      "",
      "They can see nothing until you do.",
    ].join("\n"),
  };
}

export function ticketAnsweredEmail(input: {
  ref: string;
  title: string;
  status: string;
  note: string;
  deciderName: string;
}) {
  return {
    subject: `${input.ref} was answered: ${input.status}`,
    body: [
      `${input.deciderName} answered the ticket you filed.`,
      "",
      `${input.ref}  ${input.title}`,
      `Status: ${input.status}`,
      "",
      `Why: ${input.note}`,
      "",
      `See it: ${APP_URL}/tickets`,
    ].join("\n"),
  };
}

export function ticketAiReadyEmail(input: {
  ref: string;
  title: string;
  status: string;
  summary: string;
  previewUrl?: string | null;
  branchUrl?: string | null;
}) {
  return {
    subject: `AI finished ${input.ref}: ${input.status}`,
    body: [
      `AI finished investigating a ticket.`,
      "",
      `${input.ref}  ${input.title}`,
      `Status: ${input.status}`,
      "",
      input.summary,
      "",
      input.previewUrl ? `Preview: ${input.previewUrl}` : "Preview: not ready yet",
      input.branchUrl ? `Branch: ${input.branchUrl}` : "",
      "",
      `Open it: ${APP_URL}/tickets`,
    ]
      .filter(Boolean)
      .join("\n"),
  };
}
