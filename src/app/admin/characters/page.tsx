import { getSupabaseServer } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { AdminShell, Empty, Panel } from "@/components/admin/shell";
import { kidArtUrl } from "@/lib/kid-art-url";
import { seedCharacter, approveCharacter, declineCharacter } from "./actions";

export const metadata = { title: "Characters · Steppe to Screen" };
export const dynamic = "force-dynamic";

type CharacterRow = {
  id: string;
  display_name: string;
  storage_path: string;
  status: "pending" | "live" | "declined";
  source: "kid" | "staff";
  created_at: string;
};

export default async function AdminCharactersPage() {
  const me = await requireStaff("/admin/characters");

  const sb = await getSupabaseServer();
  const { data } = sb
    ? await sb
        .from("shared_characters")
        .select("id, display_name, storage_path, status, source, created_at")
        .neq("status", "declined")
        .order("created_at", { ascending: false })
    : { data: null };

  const rows = (data as CharacterRow[] | null) ?? [];
  const pending = rows.filter((r) => r.status === "pending");
  const live = rows.filter((r) => r.status === "live");

  return (
    <AdminShell
      member={me}
      current="/admin/characters"
      title="Characters"
      subtitle={`${pending.length} waiting for review · ${live.length} live in the gallery`}
    >
      <Panel
        title="Seed a character"
        hint="Upload a PNG with the background already removed — a Canva export, for instance. Goes live immediately, credited to you rather than a kid."
      >
        <form action={seedCharacter} className="flex flex-wrap items-end gap-3">
          <label className="text-[12px] font-medium text-[#475569]">
            Credit (optional)
            <input
              name="display_name"
              placeholder="Steppe to Screen"
              className="mt-1 w-48 rounded-md border border-[#dbe0e6] px-2.5 py-1.5 text-[13px] outline-none focus:border-[#94a3b8]"
            />
          </label>
          <label className="text-[12px] font-medium text-[#475569]">
            Image (PNG, transparent background)
            <input
              type="file"
              name="image"
              accept="image/png,image/webp"
              required
              className="mt-1 block text-[13px]"
            />
          </label>
          <button
            type="submit"
            className="rounded-md bg-[#0f172a] px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-[#1e293b]"
          >
            Add to gallery
          </button>
        </form>
      </Panel>

      <Panel title="Waiting for review" className="mt-5" hint="A kid tapped &ldquo;Share to gallery&rdquo; on their runner. Nothing here is visible to anyone else until approved.">
        {pending.length === 0 ? (
          <Empty>Nothing pending.</Empty>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {pending.map((row) => (
              <div key={row.id} className="rounded-md border border-[#e2e5ea] p-2 text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={kidArtUrl(row.storage_path)} alt="" className="mx-auto h-20 w-20 rounded object-cover" />
                <p className="mt-1 truncate text-[11px] font-medium text-[#475569]">{row.display_name}</p>
                <div className="mt-2 flex gap-1.5">
                  <form action={approveCharacter} className="flex-1">
                    <input type="hidden" name="id" value={row.id} />
                    <button type="submit" className="w-full rounded bg-[#166534] px-2 py-1 text-[11px] font-medium text-white hover:bg-[#14532d]">
                      Approve
                    </button>
                  </form>
                  <form action={declineCharacter} className="flex-1">
                    <input type="hidden" name="id" value={row.id} />
                    <button type="submit" className="w-full rounded bg-[#7f1d1d] px-2 py-1 text-[11px] font-medium text-white hover:bg-[#651313]">
                      Decline
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Live in the gallery" className="mt-5">
        {live.length === 0 ? (
          <Empty>No characters live yet.</Empty>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {live.map((row) => (
              <div key={row.id} className="rounded-md border border-[#e2e5ea] p-2 text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={kidArtUrl(row.storage_path)} alt="" className="mx-auto h-20 w-20 rounded object-cover" />
                <p className="mt-1 truncate text-[11px] font-medium text-[#475569]">{row.display_name}</p>
                <p className="text-[10px] text-[#94a3b8]">{row.source === "staff" ? "Seeded" : "From a kid"}</p>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </AdminShell>
  );
}
