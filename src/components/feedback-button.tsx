"use client";

import { useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Bug, Frown, Heart, Lightbulb, MessageCircle, Paperclip, Send, X } from "lucide-react";
import { store } from "@/lib/store";
import { toastBus } from "@/lib/toast";
import { Button } from "@/components/ui/button";

const KINDS = [
  { id: "bug", icon: Bug, label: "Bug", desc: "Something broke" },
  { id: "idea", icon: Lightbulb, label: "Idea", desc: "Feature request" },
  { id: "love", icon: Heart, label: "Love it", desc: "Positive feedback" },
  { id: "confusion", icon: Frown, label: "Confusing", desc: "Hard to understand" },
] as const;

type Kind = (typeof KINDS)[number]["id"];

export function FeedbackButton() {
  // The projector view puts a big QR code in the same top-right corner this
  // button lives in by default, and the two overlap. Drop it below the QR
  // there instead of guessing a single offset that works everywhere.
  const pathname = usePathname();
  const onProjector = pathname?.startsWith("/facilitator") ?? false;
  // The first-run intro is four screens with one thing to tap on each. A gold
  // "Feedback" button in the corner of screen one is the wrong first impression.
  const onWelcome = pathname === "/welcome";
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("idea");
  const [message, setMessage] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function setImageFile(file: File | null) {
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
    setImage(file);
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith("image/"));
    const file = item?.getAsFile();
    if (file) setImageFile(file);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith("image/"));
    if (file) setImageFile(file);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);

    const profile = store.get();
    const body = new FormData();
    body.set("message", message.trim());
    body.set("kind", kind);
    body.set("page_url", window.location.pathname);
    if (profile.id !== "server-profile") body.set("profile_id", profile.id);
    if (image) body.set("image", image);

    try {
      const res = await fetch("/api/feedback", { method: "POST", body });
      if (!res.ok) throw new Error();
      toastBus.show({ title: "Feedback sent!", body: "Thanks, the team will see it." });
    } catch {
      toastBus.show({
        title: "Could not send feedback",
        body: "Check your connection and try again.",
      });
    }

    setMessage("");
    setImageFile(null);
    setOpen(false);
    setSending(false);
  }

  if (onWelcome) return null;

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Send feedback"
        className={`fixed right-4 z-[99] flex items-center gap-2 rounded-2xl bg-gold px-4 py-3 text-sm font-black text-steppe-700 shadow-[3px_4px_0_0_#b8960a] transition hover:brightness-105 active:translate-y-[2px] active:shadow-none ${
          onProjector ? "top-[13rem]" : "top-20"
        }`}
      >
        <MessageCircle size={18} />
        <span className="hidden sm:inline">Feedback</span>
      </button>

      {open && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`fixed right-4 z-[99] w-80 max-w-[calc(100vw-2rem)] rounded-lg bg-white p-4 shadow-2xl ring-1 transition ${
            onProjector ? "top-[17rem]" : "top-36"
          } ${dragOver ? "ring-2 ring-gold" : "ring-steppe/10"}`}
        >
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
                  <span className="flex items-center gap-1.5">
                    <k.icon size={14} /> {k.label}
                  </span>
                  <div className={`font-semibold ${kind === k.id ? "text-warm/70" : "text-wolf"}`}>
                    {k.desc}
                  </div>
                </button>
              ))}
            </div>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onPaste={handlePaste}
              placeholder="Tell us more… (paste a screenshot too)"
              rows={3}
              required
              className="w-full resize-none rounded-xl border-2 border-felt bg-warm px-3 py-2 text-sm font-semibold outline-none focus:border-steppe"
            />

            {imagePreview ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="Attached screenshot"
                  className="max-h-32 w-full rounded-xl border-2 border-felt object-cover"
                />
                <button
                  type="button"
                  onClick={() => setImageFile(null)}
                  className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white"
                  title="Remove screenshot"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-felt py-2 text-xs font-bold text-wolf transition hover:border-steppe/40"
              >
                <Paperclip size={13} /> Drop, paste, or tap for a screenshot
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
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
