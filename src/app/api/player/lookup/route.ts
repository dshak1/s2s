import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseService } from "@/lib/supabase/service";
import { WORKSHOP_ROSTER } from "@/content/roster";

// Which roster names already have a saved player on the server, and how much
// work is on each. Feeds the "pick your name" sign-in so a kid can see that
// their stuff is really there before they commit to anything.
//
// Server-side and service-role on purpose. The alternative was a new RLS policy
// letting anon read profiles by name, which would open a read of every row in
// the table to the whole internet; here the query is fixed, the filter is the
// roster, and the response carries names and point totals only — never ids,
// never recovery codes. Without an id in the payload nothing in this response
// is enough to take over an account.
//
// GET  -> the whole roster, annotated with what the server has for each name
// POST -> one name, resolved to the profile that would be adopted

export const dynamic = "force-dynamic";

type RosterEntry = {
  name: string;
  /** A saved player already exists under this name. */
  known: boolean;
  xp: number;
  lastSeen: string | null;
};

// Kids type their own names, so what is stored is rarely exactly what is in the
// roster — "alima", " Alima", "ALIMA". Compare folded.
function fold(value: string): string {
  return value.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

async function rosterState(): Promise<RosterEntry[]> {
  const empty = WORKSHOP_ROSTER.map((name) => ({ name, known: false, xp: 0, lastSeen: null }));
  const sb = getSupabaseService();
  if (!sb) return empty;

  const { data, error } = await sb
    .from("profiles")
    .select("display_name, xp, created_at")
    .not("display_name", "is", null);
  if (error || !data) return empty;

  // One roster name can have several rows behind it (a kid who played on two
  // devices before ever signing in). The one with the most points is the one
  // worth showing and the one adopt resolves to — see resolveName.
  const best = new Map<string, { xp: number; lastSeen: string | null }>();
  for (const row of data as { display_name: string | null; xp: number | null; created_at: string | null }[]) {
    if (!row.display_name) continue;
    const key = fold(row.display_name);
    const xp = row.xp ?? 0;
    const current = best.get(key);
    if (!current || xp > current.xp) best.set(key, { xp, lastSeen: row.created_at ?? null });
  }

  return WORKSHOP_ROSTER.map((name) => {
    const hit = best.get(fold(name));
    return {
      name,
      known: Boolean(hit),
      xp: hit?.xp ?? 0,
      lastSeen: hit?.lastSeen ?? null,
    };
  });
}

export async function GET() {
  return NextResponse.json({ roster: await rosterState() });
}

export async function POST(request: NextRequest) {
  let name = "";
  try {
    const body = (await request.json()) as { name?: unknown };
    name = typeof body.name === "string" ? body.name.trim() : "";
  } catch {
    return NextResponse.json({ error: "Send { name }.", code: "bad_request" }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: "Send { name }.", code: "bad_request" }, { status: 400 });
  }

  // Only roster names resolve. This is the line that keeps the endpoint from
  // being a general "look up any kid by name" oracle: an arbitrary name gets
  // the same answer whether or not a profile exists for it.
  const rosterName = WORKSHOP_ROSTER.find((entry) => fold(entry) === fold(name));
  if (!rosterName) {
    return NextResponse.json({ error: "Not a workshop name.", code: "not_on_roster" }, { status: 404 });
  }

  const sb = getSupabaseService();
  if (!sb) {
    return NextResponse.json({ name: rosterName, profile: null });
  }

  const { data, error } = await sb
    .from("profiles")
    .select("id, display_name, xp, created_at")
    .not("display_name", "is", null)
    .order("xp", { ascending: false })
    .limit(500);
  if (error || !data) {
    return NextResponse.json({ name: rosterName, profile: null });
  }

  const match = (data as { id: string; display_name: string | null; xp: number | null; created_at: string | null }[])
    .find((row) => row.display_name && fold(row.display_name) === fold(rosterName));

  // `profile: null` means "this name is on the roster but nobody has played
  // under it yet" — the client claims the name onto the device it is already on
  // rather than adopting anything.
  return NextResponse.json({
    name: rosterName,
    profile: match ? { id: match.id, displayName: match.display_name, xp: match.xp ?? 0 } : null,
  });
}
