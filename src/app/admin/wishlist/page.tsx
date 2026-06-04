"use client";

import { useEffect, useState } from "react";
import { Loader2, RotateCcw, Trash2 } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

type WishlistItem = {
  id: string;
  title: string;
  description: string | null;
  submitted_by: string;
  priority: "p1" | "p2" | "p3";
  status: "idea" | "planned" | "building" | "shipped" | "wont-do";
  votes: number;
  category: string;
  created_at: string;
};

const STATUSES: WishlistItem["status"][] = ["idea", "planned", "building", "shipped", "wont-do"];
const PRIORITIES: WishlistItem["priority"][] = ["p1", "p2", "p3"];

const STATUS_COLORS: Record<WishlistItem["status"], string> = {
  idea: "bg-felt text-wolf",
  planned: "bg-steppe/15 text-steppe",
  building: "bg-gold/30 text-steppe-700",
  shipped: "bg-green-100 text-green-700",
  "wont-do": "bg-red-50 text-red-500",
};

export default function AdminWishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchItems(); }, []);

  async function fetchItems() {
    setLoading(true);
    const sb = getSupabaseBrowser();
    if (sb) {
      const { data } = await sb.from("wishlist_items").select("*").order("votes", { ascending: false });
      if (data) setItems(data as WishlistItem[]);
    }
    setLoading(false);
  }

  async function updateField(id: string, field: string, value: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
    const sb = getSupabaseBrowser();
    if (sb) await sb.from("wishlist_items").update({ [field]: value }).eq("id", id);
  }

  async function del(id: string) {
    if (!confirm("Delete this item?")) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
    const sb = getSupabaseBrowser();
    if (sb) await sb.from("wishlist_items").delete().eq("id", id);
  }

  return (
    <div className="min-h-dvh bg-warm font-admin">
      <div className="border-b border-black/8 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-steppe">Wishlist Admin</h1>
            <p className="text-xs text-wolf">{items.length} items</p>
          </div>
          <Button variant="outline" onClick={fetchItems}><RotateCcw size={14} /> Refresh</Button>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-wolf" size={32} />
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-white shadow ring-1 ring-black/5">
            <table className="w-full text-sm">
              <thead className="border-b border-black/5 bg-felt/50 text-xs font-black uppercase tracking-wider text-wolf">
                <tr>
                  <th className="px-4 py-3 text-left">Votes</th>
                  <th className="px-4 py-3 text-left">Title / By</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Priority</th>
                  <th className="px-4 py-3 text-left"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/4">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-felt/30">
                    <td className="px-4 py-3 font-black text-steppe">{item.votes}</td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-steppe">{item.title}</div>
                      {item.description && (
                        <div className="mt-0.5 text-xs text-wolf">{item.description}</div>
                      )}
                      <div className="mt-0.5 text-xs text-wolf/60">by {item.submitted_by}</div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={item.status}
                        onChange={(e) => updateField(item.id, "status", e.target.value)}
                        className={`rounded-lg px-2 py-1 text-xs font-black ${STATUS_COLORS[item.status]} border-none outline-none`}
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={item.priority}
                        onChange={(e) => updateField(item.id, "priority", e.target.value)}
                        className="rounded-lg border border-felt bg-white px-2 py-1 text-xs font-bold outline-none"
                      >
                        {PRIORITIES.map((p) => <option key={p} value={p}>{p.toUpperCase()}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => del(item.id)} className="text-wolf hover:text-terra">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
