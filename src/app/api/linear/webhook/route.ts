import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseService } from "@/lib/supabase/service";
import { statusForLinearState } from "@/lib/linear";

// Linear -> idea status. The other half of the one-way push in
// src/app/ideas/actions.ts: once an issue exists, its state is the truth about
// whether the thing is being built, and the board should say so without anyone
// re-typing it.
//
// Needs LINEAR_WEBHOOK_SECRET (to verify) and SUPABASE_SERVICE_ROLE_KEY (there
// is no user session on a webhook, so RLS has to be bypassed).

function verify(raw: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

type LinearWebhook = {
  action?: string;
  type?: string;
  data?: {
    id?: string;
    url?: string;
    state?: { type?: string };
    attachments?: Array<{ url?: string }>;
  };
};

export async function POST(request: NextRequest) {
  const secret = process.env.LINEAR_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "webhook not configured" }, { status: 501 });
  }

  const raw = await request.text();
  if (!verify(raw, request.headers.get("linear-signature"), secret)) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  const sb = getSupabaseService();
  if (!sb) {
    return NextResponse.json({ error: "service key missing" }, { status: 501 });
  }

  let payload: LinearWebhook;
  try {
    payload = JSON.parse(raw) as LinearWebhook;
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  if (payload.type !== "Issue" || !payload.data?.id) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const status = statusForLinearState(payload.data.state?.type ?? "");
  if (!status) return NextResponse.json({ ok: true, ignored: true });

  // Only ideas that were pushed from here are touched, and only when they
  // already carry a decision note — the CHECK constraint in 0009 would reject
  // the update otherwise, and silently dropping the reason is the one thing
  // this board must never do.
  const { data: idea } = await sb
    .from("wishlist_items")
    .select("id, decision_note")
    .eq("linear_issue_id", payload.data.id)
    .maybeSingle();

  if (!idea) return NextResponse.json({ ok: true, ignored: true });
  if (!idea.decision_note) return NextResponse.json({ ok: true, ignored: "no decision note" });

  // A deploy preview attached to the issue becomes the "try the draft" link.
  const previewUrl = payload.data.attachments?.find((a) =>
    /vercel\.app|netlify\.app/.test(a.url ?? ""),
  )?.url;

  await sb
    .from("wishlist_items")
    .update({
      status,
      ...(previewUrl ? { preview_url: previewUrl } : {}),
    })
    .eq("id", idea.id);

  return NextResponse.json({ ok: true, status });
}
