"use client";

import { useEffect, useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase/client";

type FeedbackItem = {
  id: string;
  message: string;
  kind: "bug" | "idea" | "love" | "confusion" | "general";
  page_url: string | null;
  created_at: string;
};

// No emoji on the inside. The kids' app can be playful; a tool someone reads
// forty rows of should not be.
const KIND_META: Record<FeedbackItem["kind"], { label: string; color: string }> = {
  bug: { label: "Bug", color: "bg-[#fef2f2] text-[#b91c1c]" },
  idea: { label: "Idea", color: "bg-[#fefce8] text-[#a16207]" },
  love: { label: "Love", color: "bg-[#f0fdf4] text-[#15803d]" },
  confusion: { label: "Confusing", color: "bg-[#fff7ed] text-[#c2410c]" },
  general: { label: "General", color: "bg-[#eef1f5] text-[#64748b]" },
};

export function FeedbackList() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [kindFilter, setKindFilter] = useState<FeedbackItem["kind"] | "all">("all");

  useEffect(() => { fetchItems(); }, []);

  async function fetchItems() {
    setLoading(true);
    const sb = getSupabaseBrowser();
    if (sb) {
      const { data } = await sb
        .from("feedback_items")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (data) setItems(data as FeedbackItem[]);
    }
    setLoading(false);
  }

  const visible = kindFilter === "all" ? items : items.filter((i) => i.kind === kindFilter);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[12px] text-[#94a3b8]">{items.length} submissions</p>
        <button
          onClick={fetchItems}
          className="inline-flex items-center gap-1 rounded-md border border-[#dbe0e6] bg-white px-2.5 py-1 text-[12px] font-medium text-[#475569] transition hover:bg-[#f1f3f6]"
        >
          <RotateCcw size={13} /> Refresh
        </button>
      </div>

      <div>
        <div className="mb-4 flex flex-wrap gap-2">
          {(["all", "bug", "idea", "love", "confusion", "general"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKindFilter(k)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                kindFilter === k ? "bg-[#0f172a] text-white" : "bg-white text-[#64748b] hover:bg-[#eef1f5]"
              }`}
            >
              {k === "all" ? "All" : KIND_META[k].label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#64748b]" size={32} /></div>
        ) : visible.length === 0 ? (
          <p className="py-16 text-center font-bold text-[#64748b]">No feedback yet.</p>
        ) : (
          <div className="space-y-3">
            {visible.map((item) => {
              const meta = KIND_META[item.kind];
              return (
                <div key={item.id} className="flex gap-3 rounded-lg bg-white p-4 border border-[#e2e5ea]">
                  <span
                    className={`h-fit flex-shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium ${meta.color}`}
                  >
                    {meta.label}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#0f172a]">{item.message}</p>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-[#94a3b8]">
                      {item.page_url && <span className="font-mono">{item.page_url}</span>}
                      <span>{new Date(item.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
