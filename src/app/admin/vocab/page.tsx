import { getSupabaseServer } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { AdminShell, Empty, Panel } from "@/components/admin/shell";
import { CATEGORIES, CATEGORY_LABELS, type VocabCategory } from "@/content/vocab";
import { addVocabWord } from "./actions";

export const metadata = { title: "Vocab · Steppe to Screen" };
export const dynamic = "force-dynamic";

type ContentItemRow = {
  id: string;
  ref_slug: string;
  payload: { kk?: string; latin?: string; en?: string; category?: VocabCategory };
  created_at: string;
};

const field =
  "mt-1 w-full rounded-md border border-[#dbe0e6] px-2.5 py-1.5 text-[13px] outline-none focus:border-[#94a3b8]";

export default async function AdminVocabPage() {
  const me = await requireStaff("/admin/vocab");

  const sb = await getSupabaseServer();
  const { data } = sb
    ? await sb
        .from("content_items")
        .select("id, ref_slug, payload, created_at")
        .eq("kind", "vocab")
        .eq("source", "human")
        .order("created_at", { ascending: false })
    : { data: null };

  const rows = (data as ContentItemRow[] | null) ?? [];
  const byCategory = new Map<VocabCategory, ContentItemRow[]>();
  for (const row of rows) {
    const cat = row.payload.category;
    if (!cat) continue;
    byCategory.set(cat, [...(byCategory.get(cat) ?? []), row]);
  }

  return (
    <AdminShell
      member={me}
      current="/admin/vocab"
      title="Vocab"
      subtitle={`${rows.length} instructor-added word${rows.length === 1 ? "" : "s"}, live now`}
    >
      <Panel
        title="Add a word"
        hint="Goes live immediately, no deploy or publish step. Kids see it next time the game loads its pack."
      >
        <form action={addVocabWord} className="grid gap-3 sm:grid-cols-2">
          <label className="text-[12px] font-medium text-[#475569]">
            Kazakh (Cyrillic)
            <input name="kk" required className={field} />
          </label>
          <label className="text-[12px] font-medium text-[#475569]">
            Latin (optional)
            <input name="latin" className={field} />
          </label>
          <label className="text-[12px] font-medium text-[#475569]">
            English
            <input name="en" required className={field} />
          </label>
          <label className="text-[12px] font-medium text-[#475569]">
            Category
            <select name="category" required defaultValue="" className={field}>
              <option value="" disabled>
                Choose a category
              </option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="w-fit rounded-md bg-[#0f172a] px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-[#1e293b] sm:col-span-2"
          >
            Add word
          </button>
        </form>
      </Panel>

      <Panel title="Instructor-added words" className="mt-5">
        {rows.length === 0 ? (
          <Empty>No instructor-added words yet.</Empty>
        ) : (
          <div className="space-y-4">
            {CATEGORIES.filter((cat) => byCategory.has(cat)).map((cat) => (
              <div key={cat}>
                <p className="text-[12px] font-semibold text-[#64748b]">{CATEGORY_LABELS[cat]}</p>
                <ul className="mt-1 divide-y divide-[#eef1f5]">
                  {byCategory.get(cat)!.map((row) => (
                    <li key={row.id} className="flex items-center justify-between gap-3 py-1.5 text-[13px]">
                      <span className="font-medium">{row.payload.kk}</span>
                      <span className="text-[#94a3b8]">{row.payload.en}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </AdminShell>
  );
}
