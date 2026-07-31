import { getSupabaseServer } from "@/lib/supabase/server";
import {
  isDemoMember,
  requireTeam,
  ROLE_LABELS,
  STAFF_ROLES,
  type TeamMember,
  type TeamRole,
} from "@/lib/auth";
import { setRole } from "./actions";

export const metadata = { title: "Team · Steppe to Screen" };

const ROLES = Object.keys(ROLE_LABELS) as TeamRole[];

export default async function AdminTeamPage() {
  const me = await requireTeam(undefined, "/admin/team");
  const canManage = STAFF_ROLES.includes(me.role);

  const sb = await getSupabaseServer();
  const { data } = sb
    ? await sb
        .from("team_members")
        .select("id, email, display_name, role, created_at")
        .order("created_at", { ascending: true })
    : { data: null };
  const members = (data as TeamMember[] | null) ?? [];

  return (
    <div className="min-h-dvh bg-warm font-admin">
      <div className="border-b border-black/8 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-steppe">Team</h1>
            <p className="text-xs text-wolf">
              {members.length} member{members.length === 1 ? "" : "s"} · you are{" "}
              {ROLE_LABELS[me.role]}
            </p>
          </div>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-full border-2 border-steppe bg-white px-4 py-2 text-sm font-extrabold text-steppe transition hover:bg-steppe/5"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-6">
        {isDemoMember(me) && (
          <p className="mb-4 rounded-xl bg-gold/20 p-4 text-sm font-bold text-steppe-700">
            Offline demo mode — Supabase env vars are not set, so there is no real
            roster here.
          </p>
        )}

        <div className="space-y-3">
          {members.map((m) => (
            <div
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow ring-1 ring-black/5"
            >
              <div className="min-w-0">
                <p className="font-black text-steppe">
                  {m.display_name}
                  {m.id === me.id && (
                    <span className="ml-2 text-xs font-bold text-wolf">(you)</span>
                  )}
                </p>
                <p className="text-xs text-wolf/70">{m.email}</p>
              </div>

              {canManage ? (
                <form action={setRole} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={m.id} />
                  <select
                    name="role"
                    defaultValue={m.role}
                    className="rounded-xl border-2 border-felt bg-warm px-3 py-2 text-sm font-bold text-steppe outline-none focus:border-steppe"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="rounded-full bg-steppe px-4 py-2 text-sm font-extrabold text-white transition hover:bg-steppe-700"
                  >
                    Save
                  </button>
                </form>
              ) : (
                <span className="rounded-full bg-felt px-3 py-1 text-xs font-black text-wolf">
                  {ROLE_LABELS[m.role]}
                </span>
              )}
            </div>
          ))}

          {members.length === 0 && (
            <p className="py-16 text-center font-bold text-wolf">
              No team members yet.
            </p>
          )}
        </div>

        <p className="mt-6 text-xs font-semibold text-wolf/70">
          Roles: <strong>Admin/Developer</strong> can decide on ideas and change roles.
          Everyone on the team can view the dashboard, submit ideas, comment, and label
          content.
        </p>
      </div>
    </div>
  );
}
