"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp, Lightbulb, Loader2, Plus, X } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { TopNav } from "@/components/top-nav";
import { Button } from "@/components/ui/button";
import { MountainBackdrop } from "@/components/game/mountain-backdrop";
import { toastBus } from "@/lib/toast";

type WishlistItem = {
  id: string;
  title: string;
  description: string | null;
  submitted_by: string;
  priority: "p1" | "p2" | "p3";
  status: "idea" | "planned" | "building" | "shipped" | "wont-do";
  votes: number;
  category: "feature" | "bug" | "content" | "ux";
  created_at: string;
};

const STATUS_META: Record<WishlistItem["status"], { label: string; color: string }> = {
  idea: { label: "💡 Idea", color: "bg-felt text-wolf" },
  planned: { label: "📋 Planned", color: "bg-steppe/10 text-steppe" },
  building: { label: "🔨 Building", color: "bg-gold/20 text-steppe-700" },
  shipped: { label: "✅ Shipped", color: "bg-green-100 text-green-700" },
  "wont-do": { label: "❌ Won't do", color: "bg-red-50 text-red-500" },
};

const CATEGORY_META: Record<WishlistItem["category"], string> = {
  feature: "✨ Feature",
  bug: "🐛 Bug",
  content: "📚 Content",
  ux: "🎨 UX/Design",
};

const VOTED_KEY = "s2s_wishlist_votes";
function getVoted(): Set<string> {
  try {
    const raw = localStorage.getItem(VOTED_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}
function saveVoted(v: Set<string>) {
  localStorage.setItem(VOTED_KEY, JSON.stringify([...v]));
}

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [voted, setVoted] = useState<Set<string>>(() => (typeof window === "undefined" ? new Set() : getVoted()));
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<WishlistItem["status"] | "all">("all");

  // form state
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [who, setWho] = useState("");
  const [cat, setCat] = useState<WishlistItem["category"]>("feature");
  const [submitting, setSubmitting] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const sb = getSupabaseBrowser();
    if (sb) {
      const { data } = await sb
        .from("wishlist_items")
        .select("*")
        .order("votes", { ascending: false });
      if (data) setItems(data as WishlistItem[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  async function vote(item: WishlistItem) {
    const v = getVoted();
    if (v.has(item.id)) return;
    v.add(item.id);
    saveVoted(v);
    setVoted(new Set(v));
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, votes: i.votes + 1 } : i)),
    );
    const sb = getSupabaseBrowser();
    if (sb) {
      await sb.from("wishlist_items").update({ votes: item.votes + 1 }).eq("id", item.id);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !who.trim()) return;
    setSubmitting(true);
    const sb = getSupabaseBrowser();
    if (sb) {
      const { data, error } = await sb
        .from("wishlist_items")
        .insert({ title: title.trim(), description: desc.trim() || null, submitted_by: who.trim(), category: cat })
        .select()
        .single();
      if (!error && data) {
        setItems((prev) => [data as WishlistItem, ...prev]);
        toastBus.show({ title: "Idea submitted!", body: "Thanks for helping make this better.", icon: "💡" });
      }
    } else {
      // offline fallback: show fake item
      const fake: WishlistItem = {
        id: crypto.randomUUID(), title: title.trim(), description: desc.trim() || null,
        submitted_by: who.trim(), priority: "p2", status: "idea", votes: 0,
        category: cat, created_at: new Date().toISOString(),
      };
      setItems((prev) => [fake, ...prev]);
      toastBus.show({ title: "Idea saved locally", body: "Will sync when Supabase is connected.", icon: "💡" });
    }
    setTitle(""); setDesc(""); setWho(""); setShowForm(false); setSubmitting(false);
  }

  const visible = filter === "all" ? items : items.filter((i) => i.status === filter);

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#dff7ff] text-steppe">
      <MountainBackdrop scene="maker" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,.18),rgba(255,255,255,.28)_42%,rgba(255,246,206,.1))]" />
      <TopNav />
      <main className="relative z-10 mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-steppe">Feature Wishlist</h1>
            <p className="mt-1 text-sm font-semibold text-steppe/[.68]">
              Ideas from the team. Vote for what matters most.
            </p>
          </div>
          <Button variant="gold" onClick={() => setShowForm((v) => !v)}>
            <Plus size={16} /> Add idea
          </Button>
        </div>

        <AnimatePresence>
          {showForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={submit}
              className="mb-6 overflow-hidden rounded-2xl bg-white p-5 shadow ring-1 ring-black/5"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="font-black text-steppe">New idea</span>
                <button type="button" onClick={() => setShowForm(false)} className="text-wolf hover:text-steppe">
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-3">
                <input
                  value={title} onChange={(e) => setTitle(e.target.value)} required
                  placeholder="Feature title *"
                  className="w-full rounded-xl border-2 border-felt bg-warm px-3 py-2 font-black text-steppe outline-none focus:border-steppe"
                />
                <textarea
                  value={desc} onChange={(e) => setDesc(e.target.value)} rows={2}
                  placeholder="More detail (optional)"
                  className="w-full resize-none rounded-xl border-2 border-felt bg-warm px-3 py-2 text-sm font-semibold outline-none focus:border-steppe"
                />
                <div className="flex gap-2">
                  <input
                    value={who} onChange={(e) => setWho(e.target.value)} required
                    placeholder="Your name *"
                    className="min-w-0 flex-1 rounded-xl border-2 border-felt bg-warm px-3 py-2 text-sm font-bold outline-none focus:border-steppe"
                  />
                  <select
                    value={cat} onChange={(e) => setCat(e.target.value as WishlistItem["category"])}
                    className="rounded-xl border-2 border-felt bg-warm px-3 py-2 text-sm font-bold outline-none focus:border-steppe"
                  >
                    {Object.entries(CATEGORY_META).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <Button variant="gold" type="submit" disabled={submitting} className="w-full">
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <Lightbulb size={14} />}
                  Submit idea
                </Button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* status filter */}
        <div className="mb-4 flex flex-wrap gap-2">
          {(["all", "idea", "planned", "building", "shipped"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-black transition ${
                filter === s ? "bg-steppe text-white" : "bg-white text-wolf hover:bg-felt"
              }`}
            >
              {s === "all" ? "All" : STATUS_META[s].label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-wolf" size={32} />
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl bg-white py-16 text-center text-wolf shadow">
            <Lightbulb size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-bold">No ideas yet. Add the first one!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map((item) => {
              const hasVoted = voted.has(item.id);
              const sm = STATUS_META[item.status];
              return (
                <div
                  key={item.id}
                  className="flex gap-4 rounded-2xl bg-white p-4 shadow ring-1 ring-black/5"
                >
                  <button
                    onClick={() => vote(item)}
                    disabled={hasVoted}
                    className={`flex flex-shrink-0 flex-col items-center rounded-xl px-3 py-2 transition ${
                      hasVoted
                        ? "bg-gold/20 text-steppe-700"
                        : "bg-felt text-wolf hover:bg-gold/20 hover:text-steppe-700"
                    }`}
                  >
                    <ChevronUp size={18} />
                    <span className="text-sm font-black">{item.votes}</span>
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start gap-2">
                      <h3 className="font-black text-steppe">{item.title}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${sm.color}`}>
                        {sm.label}
                      </span>
                      <span className="rounded-full bg-felt px-2 py-0.5 text-[10px] font-bold text-wolf">
                        {CATEGORY_META[item.category]}
                      </span>
                    </div>
                    {item.description && (
                      <p className="mt-1 text-sm font-semibold text-wolf">{item.description}</p>
                    )}
                    <p className="mt-1 text-xs text-wolf/60">
                      by {item.submitted_by} · {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
