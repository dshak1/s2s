"use client";

import { useState } from "react";
import { Flag, X } from "lucide-react";
import { PROBLEMS, type TicketProblem } from "@/lib/tickets";
import { store } from "@/lib/store";
import { toastBus } from "@/lib/toast";

// The Duolingo flag: one tap, a short list of what's wrong, done. No typing,
// since item_id and game_slug already say which question this is.
export function ReportQuestion({ itemId, gameSlug }: { itemId: string; gameSlug: string }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  if (sent) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-wolf">
        <Flag size={12} /> Reported, thanks
      </span>
    );
  }

  async function report(problem: TicketProblem) {
    setSending(true);
    const profile = store.get();
    try {
      const res = await fetch("/api/report-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_id: itemId,
          game_slug: gameSlug,
          problem,
          profile_id: profile.id === "server-profile" ? "" : profile.id,
        }),
      });
      if (!res.ok) throw new Error();
      setSent(true);
      toastBus.show({ title: "Thanks for the flag!", body: "The team will take a look.", icon: "🚩" });
    } catch {
      toastBus.show({ title: "Could not send that", body: "Try again in a bit.", icon: "😕" });
    }
    setSending(false);
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs font-bold text-wolf/70 underline decoration-dotted transition hover:text-wolf"
      >
        <Flag size={12} /> Something wrong with this question?
      </button>
    );
  }

  return (
    <div className="rounded-xl border-2 border-felt bg-white/80 p-2.5">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-black text-steppe-700">What&apos;s wrong?</span>
        <button type="button" onClick={() => setOpen(false)} className="text-wolf">
          <X size={14} />
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(PROBLEMS) as TicketProblem[]).map((p) => (
          <button
            key={p}
            type="button"
            disabled={sending}
            onClick={() => report(p)}
            className="rounded-full bg-felt px-2.5 py-1 text-[11px] font-bold text-steppe-700 transition hover:bg-steppe hover:text-white disabled:opacity-50"
          >
            {PROBLEMS[p]}
          </button>
        ))}
      </div>
    </div>
  );
}
