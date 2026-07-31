"use client";

import { useEffect, useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

type FeedbackItem = {
  id: string;
  message: string;
  kind: "bug" | "idea" | "love" | "confusion" | "general";
  page_url: string | null;
  created_at: string;
};

const KIND_META: Record<FeedbackItem["kind"], { emoji: string; color: string }> = {
  bug: { emoji: "🐛", color: "bg-red-50 text-red-600" },
  idea: { emoji: "💡", color: "bg-gold/20 text-steppe-700" },
  love: { emoji: "❤️", color: "bg-green-50 text-green-700" },
  confusion: { emoji: "😕", color: "bg-orange-50 text-orange-600" },
  general: { emoji: "💬", color: "bg-felt text-wolf" },
};

export default function AdminFeedbackPage() {
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
    <div className="min-h-dvh bg-warm font-admin">
      <div className="border-b border-black/8 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-steppe">In-App Feedback</h1>
            <p className="text-xs text-wolf">{items.length} submissions</p>
          </div>
          <Button variant="outline" onClick={fetchItems}><RotateCcw size={14} /> Refresh</Button>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-4 flex flex-wrap gap-2">
          {(["all", "bug", "idea", "love", "confusion", "general"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKindFilter(k)}
              className={`rounded-full px-3 py-1.5 text-xs font-black transition ${
                kindFilter === k ? "bg-steppe text-warm" : "bg-white text-wolf hover:bg-felt"
              }`}
            >
              {k === "all" ? "All" : `${KIND_META[k].emoji} ${k}`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-wolf" size={32} /></div>
        ) : visible.length === 0 ? (
          <p className="py-16 text-center font-bold text-wolf">No feedback yet.</p>
        ) : (
          <div className="space-y-3">
            {visible.map((item) => {
              const meta = KIND_META[item.kind];
              return (
                <div key={item.id} className="flex gap-3 rounded-2xl bg-white p-4 shadow ring-1 ring-black/5">
                  <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-base ${meta.color}`}>
                    {meta.emoji}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-steppe">{item.message}</p>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-wolf/60">
                      {item.page_url && <span>📍 {item.page_url}</span>}
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
