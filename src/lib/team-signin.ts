import { getSupabaseService } from "@/lib/supabase/service";
import { approvalWaitingEmail, emailEnabled, sendEmail } from "@/lib/email";

type TeamMemberRow = {
  role: string | null;
  email: string;
  display_name: string | null;
  created_at: string | null;
};

// Minimal shape of the server client both sign-in landings hold. Typing the
// full SupabaseClient generic here would drag the database types through two
// route files for one RPC call.
type RpcClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: TeamMemberRow | null; error: { message: string } | null }>;
};

// Runs once per sign-in, after the session exists: makes sure a team_members
// row exists (the first person ever to sign in becomes admin — see
// ensure_team_member in 0005) and tells the admins about a brand new signup.
//
// Shared by the magic-link landing (/auth/callback) and the emailed-code
// landing (/auth/complete) so a code sign-in is not a second-class citizen.
export async function completeTeamSignIn(
  sb: RpcClient,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: member, error } = await sb.rpc("ensure_team_member", {
    p_display_name: null,
  });
  if (error) return { ok: false, error: error.message };

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
        // ensure_team_member is called with a null display name, so a brand
        // new row has none — the email said "null is waiting for access".
        const { subject, body } = approvalWaitingEmail({
          name: member.display_name || member.email,
          email: member.email,
        });
        for (const admin of (admins ?? []) as Array<{ email: string }>) {
          sendEmail({ to: admin.email, subject, body }).catch(() => {});
        }
      }
    }
  }

  return { ok: true };
}

// `next` is attacker-controllable on both landings, so only same-origin
// relative paths are ever followed.
export function safeNext(next: string | null, fallback: string) {
  if (!next) return fallback;
  return next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}
