"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { PlayerAccountPanel } from "@/components/player-account-panel";
import { useExperimental } from "@/lib/experimental-mode";
import { TopNav } from "@/components/top-nav";
import { Avatar } from "@/components/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VOCAB, CATEGORIES, CATEGORY_LABELS, vocabByCategory, type VocabCategory } from "@/content/vocab";
import { BADGES } from "@/content/badges";
import { VISIBLE_GAMES } from "@/content/games";
import { KID_COVERS } from "@/content/kid-covers";
import { store, useProfile, masteredLetterCount, isVocabMastered } from "@/lib/store";
import { toastBus } from "@/lib/toast";
import { BookOpenCheck, Check, FlaskConical, Gamepad2, Pencil, RotateCcw, Snowflake, Trash2, TriangleAlert, Volume2, X } from "lucide-react";
import type { Artifact } from "@/lib/store";

const ARTIFACT_LABELS: Record<Artifact["kind"], string> = {
  tanba: "🎨 Avatar",
  canva: "🎨 Drawing",
  story: "📖 Story",
  background: "🏞️ Background",
  homework: "📚 Homework",
  runner: "🏃 Runner",
};

export default function ProfilePage() {
  const params = useParams<{ id: string }>();
  const p = useProfile();
  const [experimental, setExperimental] = useExperimental();
  const [adopting, setAdopting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(p.displayName);
  const masteredVocab = VOCAB.filter((v) => isVocabMastered(p, v.slug)).length;
  const letters = masteredLetterCount(p);
  const earned = new Set(p.badges);

  // The [id] in the URL only matters once the local profile has loaded (it
  // starts out as "server-profile" during SSR/hydration) and only when it
  // actually names someone else. That is what "different kid on every
  // device" looked like from the outside.
  const foreignId = p.id !== "server-profile" && params.id && params.id !== p.id ? params.id : null;

  async function adoptThisPage() {
    if (!foreignId) return;
    setAdopting(true);
    const result = await store.adoptById(foreignId);
    setAdopting(false);
    if (result.ok) {
      toastBus.show({
        title: `Welcome back, ${result.name || "friend"}!`,
        body: "Your drawings and points are here.",
        icon: "✨",
      });
    } else {
      toastBus.show({
        title: "Could not find that page",
        body: "It might only exist on a different device.",
        icon: "😕",
      });
    }
  }

  function startEditingName() {
    setNameInput(p.displayName);
    setEditingName(true);
  }

  function saveName() {
    const trimmed = nameInput.trim().slice(0, 24);
    if (trimmed) {
      store.setDisplayName(trimmed);
      toastBus.show({ title: "Name updated!", body: `You're now ${trimmed}.`, icon: "✏️" });
    }
    setEditingName(false);
  }

  return (
    <div className="min-h-dvh bg-warm">
      <TopNav />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        {foreignId && (
          <div className="rounded-2xl border-2 border-dashed border-gold bg-gold/10 p-4 text-center">
            <p className="font-black text-steppe-700">This is someone else&apos;s page. Is this you?</p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              <Button variant="gold" size="sm" onClick={adoptThisPage} disabled={adopting}>
                {adopting ? "Loading…" : "Yes, this is me"}
              </Button>
              <Link
                href={`/profile/${p.id}`}
                className="flex items-center rounded-full bg-white/70 px-4 py-1.5 text-sm font-black text-steppe-700"
              >
                No, show mine
              </Link>
            </div>
          </div>
        )}

        {/* header */}
        <div className="flex flex-col items-center gap-4 rounded-3xl bg-steppe p-6 text-warm sm:flex-row sm:items-center">
          <div className="relative">
            <Avatar size={88} />
            <Link
              href="/play/tanba-studio"
              title="Change avatar"
              aria-label="Change avatar"
              className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full border-2 border-steppe bg-gold text-steppe-700 shadow-sm transition hover:scale-105"
            >
              <Pencil size={14} />
            </Link>
          </div>
          <div className="flex-1 text-center sm:text-left">
            {editingName ? (
              <div className="flex items-center justify-center gap-1.5 sm:justify-start">
                <input
                  autoFocus
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveName();
                    if (e.key === "Escape") setEditingName(false);
                  }}
                  maxLength={24}
                  aria-label="Your name"
                  className="w-48 rounded-lg bg-white/20 px-2 py-1 text-2xl font-black text-warm placeholder:text-warm/50 focus:bg-white/30 focus:outline-none"
                />
                <button type="button" title="Save name" aria-label="Save name" onClick={saveName} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gold text-steppe-700">
                  <Check size={16} />
                </button>
                <button type="button" title="Cancel" aria-label="Cancel" onClick={() => setEditingName(false)} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/20 text-warm">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <h1 className="flex items-center justify-center gap-2 text-3xl font-black sm:justify-start">
                {p.displayName}
                <button type="button" title="Change name" aria-label="Change name" onClick={startEditingName} className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/20 text-warm transition hover:bg-white/30">
                  <Pencil size={13} />
                </button>
              </h1>
            )}
            <div className="mt-1 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
              <span className="rounded-full bg-gold px-3 py-1 font-black text-steppe-700">{p.xp} XP</span>
              <span className="flex items-center gap-1 font-bold">
                Streak:
                {Array.from({ length: Math.max(1, p.streakWeeks) }).map((_, i) => (
                  <Snowflake key={i} size={18} className="text-gold" />
                ))}
                <span className="text-warm/70">({p.streakWeeks} wks)</span>
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/play" className="inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 font-black text-steppe-700"><Gamepad2 size={17} /> Play</Link>
            <Link href="/homework" className="inline-flex items-center gap-2 rounded-full bg-white/20 px-5 py-2.5 font-black text-warm"><BookOpenCheck size={17} /> Homework</Link>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* mastery */}
          <Card>
            <h2 className="mb-1 text-lg font-black text-steppe">Word mastery</h2>
            <p className="mb-3 text-sm text-wolf">{masteredVocab} / {VOCAB.length} words mastered</p>
            <div className="space-y-2">
              {CATEGORIES.map((cat: VocabCategory) => {
                const total = vocabByCategory(cat).length;
                const done = vocabByCategory(cat).filter((v) => isVocabMastered(p, v.slug)).length;
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-xs font-bold text-steppe-700">
                      <span>{CATEGORY_LABELS[cat]}</span>
                      <span>{done}/{total}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-steppe/15">
                      <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${(done / total) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* sound progress */}
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="mb-1 text-lg font-black text-steppe">Kazakh sounds</h2>
                <p className="text-sm text-wolf">{letters} letters mastered</p>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-lg bg-[#fff4bd] text-steppe">
                <Volume2 size={22} />
              </div>
            </div>
            <div className="mt-5 grid grid-cols-9 gap-1.5" aria-label={`${letters} letters mastered`}>
              {Array.from({ length: 36 }).map((_, index) => (
                <span key={index} className={`aspect-square rounded-sm ${index < letters ? "bg-[#ff9a4f]" : "bg-steppe/10"}`} />
              ))}
            </div>
            <Link href="/play/learn" className="mt-4 inline-flex items-center gap-1 text-sm font-black text-steppe underline">
              Practise sounds
            </Link>
          </Card>
        </div>

        {/* badge case */}
        <Card>
          <h2 className="mb-3 text-lg font-black text-steppe">Badge case</h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
            {BADGES.map((b) => {
              const got = earned.has(b.id);
              return (
                <div key={b.id} className={`rounded-2xl p-3 text-center ${got ? "bg-gold/25" : "bg-black/5 opacity-60"}`} title={got ? b.name : b.hint}>
                  <div className={`text-3xl ${got ? "text-gold" : "text-wolf/40 grayscale"}`}>{b.symbol}</div>
                  <div className="mt-1 text-[11px] font-bold leading-tight text-steppe-700">{got ? b.name : "Locked"}</div>
                  {!got && <div className="mt-0.5 text-[10px] leading-tight text-wolf">{b.hint}</div>}
                </div>
              );
            })}
          </div>
        </Card>

        {/* last played */}
        <div>
          <h2 className="mb-3 text-lg font-black text-steppe">Jump back in</h2>
          <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
            {VISIBLE_GAMES.map((g) => (
              <Link key={g.slug} href={g.href} className={`min-w-[160px] rounded-2xl ${g.accent} p-4 text-warm`}>
                <div className="text-xs font-bold text-gold">{g.kk}</div>
                <div className="font-black">{g.title}</div>
              </Link>
            ))}
          </div>
        </div>

        {/* home background, covers designed by workshop players */}
        <Card>
          <h2 className="mb-1 text-lg font-black text-steppe">Home background</h2>
          <p className="mb-3 text-sm text-wolf">
            Designed by our players, pick yours and it becomes your home page.{" "}
            <Link href="/covers" className="font-bold text-steppe underline">See them big →</Link>
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <button
              onClick={() => {
                store.setHomeCover(null);
                toastBus.show({ title: "Back to the mountains", body: "Classic home background restored.", icon: "🏔️" });
              }}
              className={`flex aspect-video items-center justify-center rounded-2xl border-4 bg-felt text-sm font-black text-steppe-700 transition active:scale-95 ${
                p.homeCoverId === null ? "border-gold" : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              🏔️ Classic
            </button>
            {KID_COVERS.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  store.setHomeCover(c.id);
                  toastBus.show({
                    title: "Home background set!",
                    body: c.artist ? `Cover by ${c.artist} is now your home page.` : "This cover is now your home page.",
                    icon: "🎨",
                  });
                }}
                aria-label={c.artist ? `Use cover by ${c.artist}` : "Use workshop cover"}
                className={`relative aspect-video overflow-hidden rounded-2xl border-4 transition active:scale-95 ${
                  p.homeCoverId === c.id ? "border-gold" : "border-transparent opacity-70 hover:opacity-100"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.image} alt="" className="h-full w-full object-cover" />
                {c.artist && (
                  <span className="absolute bottom-1 left-1 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-black text-white">
                    {c.artist}
                  </span>
                )}
              </button>
            ))}
          </div>
        </Card>

        {/* gallery */}
        <Card>
          <h2 className="mb-3 text-lg font-black text-steppe">My gallery</h2>
          {p.artifacts.length === 0 ? (
            <p className="text-sm text-wolf">
              Nothing yet, design an avatar or make a comic and it&apos;ll appear here.{" "}
              <Link href="/play/tanba-studio" className="font-bold text-steppe underline">Start drawing →</Link>
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              {p.artifacts.map((a) => (
                <motion.div key={a.id} whileHover={{ scale: 1.05 }} className="relative overflow-hidden rounded-2xl border-2 border-steppe/20 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.dataUrl} alt={a.kind} className="aspect-square w-full object-cover" />
                  <button
                    type="button"
                    title="Delete"
                    aria-label={`Delete this ${a.kind}`}
                    onClick={() => {
                      store.deleteArtifact(a.id);
                      toastBus.show({ title: "Deleted", body: "It's gone from your gallery.", icon: "🗑️" });
                    }}
                    className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-black/55 text-white shadow-sm transition hover:bg-black/75"
                  >
                    <Trash2 size={14} />
                  </button>
                  <div className="truncate bg-felt py-0.5 text-center text-[10px] font-bold text-steppe-700">
                    {a.kind === "homework" ? `📚 ${a.meta?.title || "homework"}` : ARTIFACT_LABELS[a.kind]}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </Card>

        <PlayerAccountPanel />

        {/* Palette and the shared Button, not a one-off emerald pill with a
            blurred glow behind it. Button.tsx is explicit that this system is
            flat colour plus a hard offset shadow, no gradients and no glows —
            that soft halo was exactly the look this project has decided against. */}
        <Card id="experimental" className="scroll-mt-24 border-2 border-gold/40">
          <h2 className="mb-1 flex items-center gap-2 text-lg font-black text-steppe">
            <FlaskConical size={18} className="text-[#ff8f4f]" /> Experimental mode
          </h2>
          <p className="mb-3 text-sm text-wolf">
            Not developer mode. You try stuff that is not guaranteed first try, then tell us if the screen still looks okay. Ideas you submit can get built back to just you before they hit everyone.
          </p>
          <Button
            variant={experimental ? "gold" : "primary"}
            size="sm"
            aria-pressed={experimental}
            onClick={() => setExperimental(!experimental)}
          >
            <FlaskConical size={15} />
            {experimental ? "Experimental is on" : "Turn experimental on"}
          </Button>
        </Card>

        <Card className="border-2 border-terra/20">
          <h2 className="mb-1 flex items-center gap-2 text-lg font-black text-steppe"><TriangleAlert size={18} className="text-terra" /> Reset profile</h2>
          <p className="mb-3 text-sm text-wolf">Starts you over from zero on this device: points, badges, drawings, everything. Can&apos;t be undone.</p>
          {!confirmReset ? (
            <Button variant="outline" size="sm" onClick={() => setConfirmReset(true)}>
              <RotateCcw size={15} /> Reset my profile
            </Button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-black text-terra">Delete everything and start over?</p>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  store.reset();
                  toastBus.show({ title: "Profile reset", body: "Fresh start!", icon: "🔄" });
                }}
              >
                Yes, reset
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmReset(false)}>Cancel</Button>
            </div>
          )}
        </Card>

        <div className="pb-6" />
      </main>
    </div>
  );
}
