"use client";

import { useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { store } from "@/lib/store";
import { toastBus } from "@/lib/toast";
import { Button } from "@/components/ui/button";

const KINDS = [
  { id: "bug", label: "🐛 Bug", desc: "Something broke" },
  { id: "idea", label: "💡 Idea", desc: "Feature request" },
  { id: "love", label: "❤️ Love it", desc: "Positive feedback" },
  { id: "confusion", label: "😕 Confusing", desc: "Hard to understand" },
] as const;

type Kind = (typeof KINDS)[number]["id"];

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("idea");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);

    const sb = getSupabaseBrowser();
    if (sb) {
      const profile = store.get();
      await sb.from("feedback_items").insert({
        message: message.trim(),
        kind,
        page_url: window.location.pathname,
        profile_id: profile.id === "server-profile" ? null : profile.id,
      });
    }

    toastBus.show({ title: "Feedback sent!", body: "Thanks, the team will see it.", icon: "🙏" });
    setMessage("");
    setOpen(false);
    setSending(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Send feedback"
        className="fixed right-4 top-20 z-[99] flex items-center gap-2 rounded-full border border-white/80 bg-[linear-gradient(135deg,#ffd84f_0%,#ff9a4f_52%,#ff6f9f_100%)] px-4 py-3 text-sm font-black text-steppe-700 shadow-xl shadow-orange-200/70 transition hover:scale-105"
      >
        <MessageCircle size={18} />
        <span className="hidden sm:inline">Feedback</span>
      </button>

      {open && (
        <div className="fixed right-4 top-36 z-[99] w-80 max-w-[calc(100vw-2rem)] rounded-lg bg-white p-4 shadow-2xl ring-1 ring-steppe/10">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-black text-steppe">Send feedback</span>
            <button onClick={() => setOpen(false)} className="text-wolf hover:text-steppe">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={submit} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              {KINDS.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => setKind(k.id)}
                  className={`rounded-xl p-2 text-left text-xs font-black transition ${
                    kind === k.id
                      ? "bg-steppe text-white"
                      : "bg-felt text-steppe hover:bg-felt/80"
                  }`}
                >
                  {k.label}
                  <div className={`font-semibold ${kind === k.id ? "text-warm/70" : "text-wolf"}`}>
                    {k.desc}
                  </div>
                </button>
              ))}
            </div>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us more…"
              rows={3}
              required
              className="w-full resize-none rounded-xl border-2 border-felt bg-warm px-3 py-2 text-sm font-semibold outline-none focus:border-steppe"
            />

            <Button variant="gold" type="submit" disabled={sending || !message.trim()}>
              <Send size={14} /> {sending ? "Sending…" : "Send"}
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
