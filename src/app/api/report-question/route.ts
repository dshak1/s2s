import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseService } from "@/lib/supabase/service";
import { PROBLEMS, type TicketProblem } from "@/lib/tickets";

// Kids are anonymous, so this is a route with the service-role client rather
// than a server action gated by requireTeam — same reason as /api/feedback.
// Rate limited by profile id (the only identity an anonymous kid has) so a
// bored kid can't file two hundred of these mid-game.

const RATE_LIMIT = 5;
const WINDOW_MS = 60 * 60 * 1000;

function isProblem(v: string): v is TicketProblem {
  return v in PROBLEMS;
}

export async function POST(request: NextRequest) {
  const sb = getSupabaseService();
  if (!sb) return NextResponse.json({ error: "Supabase is not configured." }, { status: 501 });

  let body: { item_id?: string; game_slug?: string; problem?: string; profile_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad JSON." }, { status: 400 });
  }

  const itemId = String(body.item_id ?? "").trim();
  const gameSlug = String(body.game_slug ?? "").trim();
  const problem = String(body.problem ?? "").trim();
  const profileId = String(body.profile_id ?? "").trim();

  if (!itemId && !gameSlug && !problem) {
    return NextResponse.json({ error: "Nothing to identify the question by." }, { status: 400 });
  }
  if (problem && !isProblem(problem)) {
    return NextResponse.json({ error: "Unknown problem." }, { status: 400 });
  }
  if (!profileId) {
    return NextResponse.json({ error: "Missing profile." }, { status: 400 });
  }

  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const { count } = await sb
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .eq("type", "question")
    .eq("reporter_profile_id", profileId)
    .gte("created_at", since);

  if ((count ?? 0) >= RATE_LIMIT) {
    return NextResponse.json(
      { error: "Too many reports for now. Try again later." },
      { status: 429 },
    );
  }

  const { data: ticket, error } = await sb
    .from("tickets")
    .insert({
      type: "question",
      title: `Flagged: ${itemId || gameSlug || "a question"}`,
      item_id: itemId || null,
      game_slug: gameSlug || null,
      problem: (problem || null) as TicketProblem | null,
      reporter_profile_id: profileId,
      status: "inbox",
    })
    .select("id, ref")
    .single();

  if (error || !ticket) {
    return NextResponse.json(
      { error: error?.message ?? "Could not file the report." },
      { status: 500 },
    );
  }

  if (itemId) {
    // Ahead of everything unflagged: priority 10 beats every other tier in
    // label_queue (gold=60, analytics=100, everything-else=200).
    await sb.from("label_tasks").upsert(
      {
        item_id: itemId,
        origin: "kid_flag",
        uncertainty_reason: problem || "flagged_by_kid",
        priority: 10,
      },
      { onConflict: "item_id,origin,uncertainty_reason", ignoreDuplicates: true },
    );
  }

  return NextResponse.json({ ok: true, ref: ticket.ref });
}
