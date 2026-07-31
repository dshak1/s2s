"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { BookOpenCheck, Camera, Loader2, X } from "lucide-react";
import { TopNav } from "@/components/top-nav";
import { MountainBackdrop } from "@/components/game/mountain-backdrop";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { store, useProfile } from "@/lib/store";
import { toastBus } from "@/lib/toast";

// Shrink kid photos before storing them — keeps localStorage (and any future
// Supabase upload) small while staying plenty sharp for review.
async function fileToDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

export default function HomeworkPage() {
  const p = useProfile();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  // Default the date to today (set in an effect so the static prerender and
  // the client agree on the initial markup).
  useEffect(() => {
    setDate(new Date().toISOString().slice(0, 10));
  }, []);

  const submissions = p.artifacts.filter((a) => a.kind === "homework");

  async function onPickFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      setPreview(await fileToDataUrl(file));
    } catch {
      toastBus.show({ title: "Couldn't read that image", body: "Try a different photo.", icon: "😅" });
    }
    setBusy(false);
  }

  function submit() {
    if (!preview || busy) return;
    store.addHomework(preview, {
      title: title.trim() || undefined,
      date: date || undefined,
      note: note.trim() || undefined,
    });
    toastBus.show({ title: "Homework turned in! +20 XP", body: title.trim() || "Nice work, it's saved to your gallery.", icon: "📚" });
    setPreview(null);
    setTitle("");
    setNote("");
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#dff7ff] text-steppe">
      <MountainBackdrop scene="maker" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,.18),rgba(255,255,255,.28)_42%,rgba(255,246,206,.1))]" />
      <TopNav />
      <main className="relative z-10 mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-black text-steppe">Turn in homework</h1>
          <p className="mt-1 text-sm font-semibold text-steppe/[.68]">
            Snap a photo of your work. Labels are optional, a title, the date, or what it is.
          </p>
        </div>

        <Card>
          {/* photo */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onPickFile(e.target.files?.[0])}
          />
          {preview ? (
            <div className="relative overflow-hidden rounded-2xl border-2 border-felt">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Your homework" className="max-h-80 w-full object-contain bg-white" />
              <button
                onClick={() => {
                  setPreview(null);
                  if (fileRef.current) fileRef.current.value = "";
                }}
                aria-label="Remove photo"
                className="absolute right-2 top-2 rounded-full bg-black/55 p-1.5 text-white transition hover:bg-black/75"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="flex w-full flex-col items-center gap-2 rounded-2xl border-4 border-dashed border-steppe/25 bg-warm/60 py-10 font-black text-steppe/70 transition hover:border-steppe/50 hover:bg-warm"
            >
              {busy ? <Loader2 size={36} className="animate-spin" /> : <Camera size={36} />}
              Tap to add a photo of your homework
            </button>
          )}

          {/* optional labels */}
          <div className="mt-4 space-y-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title (optional), e.g. My animal words"
              className="w-full rounded-xl border-2 border-felt bg-warm px-3 py-2 font-black text-steppe outline-none focus:border-steppe"
            />
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="flex items-center gap-2 rounded-xl border-2 border-felt bg-warm px-3 py-2 text-sm font-bold text-steppe">
                Date
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-transparent font-bold outline-none"
                />
              </label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What is it? (optional)"
                className="min-w-0 flex-1 rounded-xl border-2 border-felt bg-warm px-3 py-2 text-sm font-bold outline-none focus:border-steppe"
              />
            </div>
            <Button variant="gold" className="w-full" disabled={!preview || busy} onClick={submit}>
              <BookOpenCheck size={16} /> Turn it in
            </Button>
          </div>
        </Card>

        {/* my submissions */}
        <h2 className="mb-3 mt-8 text-lg font-black text-steppe">My homework ({submissions.length})</h2>
        {submissions.length === 0 ? (
          <Card>
            <p className="text-sm text-wolf">Nothing turned in yet, your submissions will show up here.</p>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {submissions.map((a) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="overflow-hidden rounded-2xl bg-white shadow ring-1 ring-black/5"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.dataUrl} alt={a.meta?.title ?? "Homework"} className="aspect-video w-full bg-felt object-cover" />
                <div className="p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-black text-steppe">{a.meta?.title || "Homework"}</span>
                    <span className="rounded-full bg-felt px-2 py-0.5 text-[10px] font-black text-wolf">📚 This is homework</span>
                  </div>
                  {a.meta?.note && <p className="mt-1 text-sm font-semibold text-wolf">{a.meta.note}</p>}
                  <p className="mt-1 text-xs text-wolf/60">
                    {a.meta?.date || new Date(a.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
