import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { completeTeamSignIn, safeNext } from "@/lib/team-signin";

// Magic-link landing. Supabase redirects here with a PKCE `code`; we trade it
// for a session cookie, then run the shared post-sign-in work.
//
// This only works when the link is opened in the same browser that asked for
// it — the PKCE verifier is a cookie on this origin. Tapping the link from a
// mail app inside the native shell opens Safari or Chrome instead, which has
// no such cookie, so the native shells sign in with the emailed code and land
// on /auth/complete rather than here.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/dashboard";
  const errorDescription = searchParams.get("error_description");

  if (errorDescription) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorDescription)}`,
    );
  }

  const sb = await getSupabaseServer();
  if (!sb || !code) {
    return NextResponse.redirect(`${origin}/login?error=missing-code`);
  }

  const { error } = await sb.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  const completed = await completeTeamSignIn(sb);
  if (!completed.ok) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(completed.error)}`,
    );
  }

  return NextResponse.redirect(`${origin}${safeNext(next, "/dashboard")}`);
}
