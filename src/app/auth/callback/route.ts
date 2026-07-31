import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

// Magic-link landing. Supabase redirects here with a PKCE `code`; we trade it
// for a session cookie, then make sure a team_members row exists (the first
// person ever to sign in becomes admin — see ensure_team_member in 0005).
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

  const { error: rpcError } = await sb.rpc("ensure_team_member", {
    p_display_name: null,
  });
  if (rpcError) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(rpcError.message)}`,
    );
  }

  // `next` is attacker-controllable, so only allow same-origin relative paths.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  return NextResponse.redirect(`${origin}${safeNext}`);
}
