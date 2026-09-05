import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { completeTeamSignIn, safeNext } from "@/lib/team-signin";

// Landing for a sign-in that finished in the page rather than through a link:
// the browser called verifyOtp() with the emailed code, which wrote the
// session cookies, and then sent us here. There is no `code` to exchange —
// the session already exists — so this only does the post-sign-in work that
// /auth/callback does, and refuses if no session actually arrived.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const next = searchParams.get("next") || "/dashboard";

  const sb = await getSupabaseServer();
  if (!sb) {
    return NextResponse.redirect(`${origin}/login?error=missing-code`);
  }

  const { data, error } = await sb.auth.getUser();
  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=missing-code`);
  }

  const completed = await completeTeamSignIn(sb);
  if (!completed.ok) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(completed.error)}`,
    );
  }

  return NextResponse.redirect(`${origin}${safeNext(next, "/dashboard")}`);
}
