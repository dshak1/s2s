import { getSupabaseServer } from "@/lib/supabase/server";
import {
  EXPERTISE_LABELS,
  isDemoMember,
  requireTeam,
  ROLE_HINTS,
  ROLE_LABELS,
  STAFF_ROLES,
  type Expertise,
  type TeamMember,
  type TeamRole,
} from "@/lib/auth";
import { AdminShell, Empty, Panel } from "@/components/admin/shell";
import { approve, decline, setRole } from "./actions";

export const metadata = { title: "Team · Steppe to Screen" };
export const dynamic = "force-dynamic";

const ROLES = Object.keys(ROLE_LABELS) as TeamRole[];
const EXPERTISES = Object.keys(EXPERTISE_LABELS) as Expertise[];

const select =
  "rounded-md border border-[#dbe0e6] bg-white px-2 py-1 text-[12px] outline-none focus:border-[#94a3b8]";

export default async function AdminTeamPage() {
  const me = await requireTeam(undefined, "/admin/team");
  const canManage = STAFF_ROLES.includes(me.role);

  const sb = await getSupabaseServer();
  const { data } = sb
    ? await sb
        .from("team_members")
        .select("id, email, display_name, role, expertise, created_at")
        .order("created_at", { ascending: true })
    : { data: null };

  const members = (data as TeamMember[] | null) ?? [];
  const waiting = members.filter((m) => m.role === "pending");
  const active = members.filter((m) => m.role === "member" || m.role === "admin");
  const declined = members.filter((m) => m.role === "declined");

  return (
    <AdminShell
      member={me}
      current="/admin/team"
      title="Team"
      subtitle={
        waiting.length > 0
          ? `${waiting.length} waiting for approval · ${active.length} active`
          : `${active.length} active`
      }
    >
      {isDemoMember(me) && (
        <Empty>Offline demo mode, no real roster here.</Empty>
      )}

      {waiting.length > 0 && (
        <Panel
          title="Waiting for approval"
          hint="A sign-in link only proves someone owns an email address. Nothing is visible to them until you approve."
          className="mb-5"
        >
          <ul className="space-y-2">
            {waiting.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#fde68a] bg-[#fefce8] px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-medium">{m.display_name}</p>
                  <p className="text-[12px] text-[#94a3b8]">
                    {m.email} · asked {new Date(m.created_at).toLocaleDateString()}
                  </p>
                </div>
                {canManage && (
                  <div className="flex items-center gap-2">
                    <form action={approve}>
                      <input type="hidden" name="id" value={m.id} />
                      <button
                        type="submit"
                        className="rounded-md bg-[#0f172a] px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-[#1e293b]"
                      >
                        Approve as member
                      </button>
                    </form>
                    <form action={setRole} className="flex items-center gap-1.5">
                      <input type="hidden" name="id" value={m.id} />
                      <input type="hidden" name="role" value="admin" />
                      <button
                        type="submit"
                        className="rounded-md border border-[#dbe0e6] bg-white px-3 py-1.5 text-[12px] font-medium text-[#475569] transition hover:bg-[#f1f3f6]"
                      >
                        Make admin
                      </button>
                    </form>
                    <form action={decline}>
                      <input type="hidden" name="id" value={m.id} />
                      <button
                        type="submit"
                        className="rounded-md border border-[#fecaca] bg-white px-3 py-1.5 text-[12px] font-medium text-[#b91c1c] transition hover:bg-[#fef2f2]"
                      >
                        Decline
                      </button>
                    </form>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel title="Members">
        {active.length === 0 ? (
          <Empty>Nobody active yet.</Empty>
        ) : (
          <ul className="divide-y divide-[#eef1f5]">
            {active.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-medium">
                    {m.display_name}
                    {m.id === me.id && (
                      <span className="ml-1.5 text-[11px] text-[#94a3b8]">(you)</span>
                    )}
                  </p>
                  <p className="text-[12px] text-[#94a3b8]">{m.email}</p>
                </div>

                {canManage ? (
                  <form action={setRole} className="flex flex-wrap items-center gap-1.5">
                    <input type="hidden" name="id" value={m.id} />
                    <select name="role" defaultValue={m.role} className={select}>
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                    <select
                      name="expertise"
                      defaultValue={m.expertise ?? "other"}
                      className={select}
                    >
                      {EXPERTISES.map((e) => (
                        <option key={e} value={e}>
                          {EXPERTISE_LABELS[e]}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="rounded-md border border-[#dbe0e6] bg-white px-2.5 py-1 text-[12px] font-medium text-[#475569] transition hover:bg-[#f1f3f6]"
                    >
                      Save
                    </button>
                  </form>
                ) : (
                  <span className="text-[12px] text-[#64748b]">
                    {ROLE_LABELS[m.role]}
                    {m.expertise && ` · ${EXPERTISE_LABELS[m.expertise]}`}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {declined.length > 0 && (
        <Panel title="Declined" hint="No access. Change their role here to let them back in." className="mt-5">
          <ul className="divide-y divide-[#eef1f5]">
            {declined.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                <span className="text-[13px] text-[#64748b]">
                  {m.display_name} <span className="text-[#94a3b8]">{m.email}</span>
                </span>
                {canManage && (
                  <form action={approve}>
                    <input type="hidden" name="id" value={m.id} />
                    <button
                      type="submit"
                      className="rounded-md border border-[#dbe0e6] bg-white px-2.5 py-1 text-[12px] font-medium text-[#475569] transition hover:bg-[#f1f3f6]"
                    >
                      Let them in
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel title="What the two fields mean" className="mt-5">
        <dl className="space-y-2.5 text-[12px]">
          {ROLES.map((r) => (
            <div key={r} className="flex gap-3">
              <dt className="w-40 shrink-0 font-medium">{ROLE_LABELS[r]}</dt>
              <dd className="text-[#64748b]">{ROLE_HINTS[r]}</dd>
            </div>
          ))}
          <div className="flex gap-3 border-t border-[#eef1f5] pt-2.5">
            <dt className="w-40 shrink-0 font-medium">Expertise</dt>
            <dd className="text-[#64748b]">
              Grants nothing. It records who a judgement came from, which is the whole
              basis of asking whether a model can match a human expert panel.
            </dd>
          </div>
        </dl>
      </Panel>
    </AdminShell>
  );
}
