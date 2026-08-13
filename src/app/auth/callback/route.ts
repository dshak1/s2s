import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseService } from "@/lib/supabase/service";
import { approvalWaitingEmail, emailEnabled, sendEmail } from "@/lib/email";

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

  const { data: member, error: rpcError } = await sb.rpc("ensure_team_member", {
    p_display_name: null,
  });
  if (rpcError) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(rpcError.message)}`,
    );
  }

  // approvalWaitingEmail existed but nothing ever called it — a new pending
  // signup landed on team_members with no signal to anyone. Fire it once,
  // right when the row is created (created_at within request latency of
  // now), not on every later sign-in attempt from the same pending account.
  if (member?.role === "pending" && member.created_at) {
    const ageMs = Date.now() - new Date(member.created_at).getTime();
    if (ageMs < 15_000 && emailEnabled()) {
      const service = getSupabaseService();
      if (service) {
        const { data: admins } = await service
          .from("team_members")
          .select("email")
          .eq("role", "admin");
        const { subject, body } = approvalWaitingEmail({
          name: member.display_name,
          email: member.email,
        });
        for (const admin of (admins ?? []) as Array<{ email: string }>) {
          sendEmail({ to: admin.email, subject, body }).catch(() => {});
        }
      }
    }
  }

  // `next` is attacker-controllable, so only allow same-origin relative paths.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  return NextResponse.redirect(`${origin}${safeNext}`);
}
