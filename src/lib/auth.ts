import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";

// Team identity. Kids never touch any of this — they stay anonymous on the
// localStorage store. These helpers guard the staff surfaces: /dashboard,
// /ideas decisions, /label, /admin/*, /facilitator.

export type TeamRole =
  | "admin"
  | "dev"
  | "educator"
  | "native_speaker"
  | "learner"
  | "observer";

export type TeamMember = {
  id: string;
  email: string;
  display_name: string;
  role: TeamRole;
  created_at: string;
};

export const STAFF_ROLES: TeamRole[] = ["admin", "dev"];

export const ROLE_LABELS: Record<TeamRole, string> = {
  admin: "Admin",
  dev: "Developer",
  educator: "Educator",
  native_speaker: "Native speaker",
  learner: "Learner",
  observer: "Observer",
};

// When Supabase env vars are absent the whole app runs as an offline demo, so
// the staff surfaces stay reachable instead of locking the demo out. This is
// the same "degrade gracefully" contract getSupabaseBrowser() follows.
const LOCAL_DEMO_MEMBER: TeamMember = {
  id: "local-demo",
  email: "demo@localhost",
  display_name: "Local demo",
  role: "admin",
  created_at: new Date(0).toISOString(),
};

export function isDemoMember(member: TeamMember): boolean {
  return member.id === LOCAL_DEMO_MEMBER.id;
}

export async function getTeamMember(): Promise<TeamMember | null> {
  const sb = await getSupabaseServer();
  if (!sb) return LOCAL_DEMO_MEMBER;

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;

  const { data } = await sb
    .from("team_members")
    .select("id, email, display_name, role, created_at")
    .eq("id", user.id)
    .maybeSingle();

  return (data as TeamMember | null) ?? null;
}

/**
 * Guard a server component or route handler. Redirects to /login when the
 * visitor is not on the team, and to /login?denied when they are on the team
 * but lack the role.
 *
 * @param roles restrict to these roles (omit to allow any team member)
 * @param next  path to return to after sign-in
 */
export async function requireTeam(
  roles?: TeamRole[],
  next?: string,
): Promise<TeamMember> {
  const member = await getTeamMember();
  const back = next ? `?next=${encodeURIComponent(next)}` : "";

  if (!member) redirect(`/login${back}`);
  if (roles && !roles.includes(member.role)) {
    redirect(`/login?denied=${encodeURIComponent(member.role)}`);
  }
  return member;
}

export async function requireStaff(next?: string): Promise<TeamMember> {
  return requireTeam(STAFF_ROLES, next);
}
