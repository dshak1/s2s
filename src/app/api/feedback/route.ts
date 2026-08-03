import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseService } from "@/lib/supabase/service";

// Kid-facing feedback has no session to act on behalf of, and both the
// `tickets` table and the `idea-attachments` bucket are team-only by RLS
// (see 0015_tickets.sql, 0009_triage.sql). A server action can't get past
// that for an anonymous kid, so this is a route using the service-role
// client instead — the same reason the labelling/question-flag flow in
// docs/next-plan.md phase 2 needs one too.

const TICKET_TYPE: Record<string, "bug" | "request"> = {
  bug: "bug",
  idea: "request",
  love: "request",
  confusion: "request",
};

const KIND_LABEL: Record<string, string> = {
  bug: "Bug",
  idea: "Idea",
  love: "Love it",
  confusion: "Confusing",
};

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const sb = getSupabaseService();
  if (!sb) return NextResponse.json({ error: "Supabase is not configured." }, { status: 501 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Bad form data." }, { status: 400 });
  }

  const message = String(form.get("message") ?? "").trim();
  const kind = String(form.get("kind") ?? "idea");
  const pageUrl = String(form.get("page_url") ?? "").trim();
  const profileId = String(form.get("profile_id") ?? "").trim();
  const image = form.get("image");

  if (!message) return NextResponse.json({ error: "Say something first." }, { status: 400 });

  // Best-effort: this table has no read path used elsewhere in this change,
  // it just keeps the existing /admin/feedback view populated.
  await sb.from("feedback_items").insert({
    message,
    kind,
    page_url: pageUrl || null,
    profile_id: profileId || null,
  });

  const { data: ticket, error } = await sb
    .from("tickets")
    .insert({
      type: TICKET_TYPE[kind] ?? "request",
      title: `${KIND_LABEL[kind] ?? "Feedback"}: ${message.slice(0, 60)}`,
      body: `${message}${pageUrl ? `\n\nFiled from ${pageUrl}.` : ""}`,
      status: "inbox",
    })
    .select("id, ref")
    .single();

  if (error || !ticket) {
    return NextResponse.json(
      { error: error?.message ?? "Could not file the ticket." },
      { status: 500 },
    );
  }

  if (image instanceof File && image.size > 0 && image.size <= MAX_IMAGE_BYTES) {
    const ext = image.type.split("/")[1]?.split("+")[0] || "png";
    const path = `feedback/${ticket.id}.${ext}`;
    const { error: uploadError } = await sb.storage
      .from("idea-attachments")
      .upload(path, image, { contentType: image.type || "image/png", upsert: true });

    if (!uploadError) {
      await sb.from("ticket_attachments").insert({
        ticket_id: ticket.id,
        kind: "image",
        storage_path: path,
        title: "Screenshot",
      });
    }
  }

  return NextResponse.json({ ok: true, ref: ticket.ref });
}
