"use client";

// "Review a workshop" — the sheet Learn opens when a kid wants the words from
// one particular session rather than the usual mix.
//
// A workshop here is a journey stop: week 1 is Almaty and its theme is family,
// week 2 is Astana and numbers, and so on (src/content/journey.ts, which is
// REGIONS plus a week number). That mapping already decides what a stop is
// *about* everywhere else in the app, so it is what a kid means by "the words
// we did at the Almaty workshop".
//
// Two views, one sheet: the list of workshops, then the terms inside one of
// them. The terms view is the review itself — every word with its Latin
// spelling, its meaning, and a tap to hear it — and "Practice this workshop"
// hands that exact word list back to Learn to quiz on.

import { useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, Lock, Volume2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JOURNEY, type JourneyStop } from "@/content/journey";
import { CATEGORY_LABELS, type VocabItem } from "@/content/vocab";
import { speakWord } from "@/lib/audio";
import { baseText } from "@/lib/lang";
import type { BaseLanguage } from "@/lib/lang";

/** A quiz needs an answer and two distractors, so a stop with fewer words than
 *  this can be read but not practised. */
const MIN_WORDS_TO_PRACTISE = 3;

export function workshopWords(vocab: VocabItem[], stop: JourneyStop): VocabItem[] {
  return vocab.filter((item) => item.category === stop.category);
}

export function WorkshopReview({
  vocab,
  baseLanguage,
  unlockedWeeks,
  onPractice,
  onClose,
}: {
  vocab: VocabItem[];
  baseLanguage: BaseLanguage;
  /** How far along the journey this kid is — a later stop is marked as not
   *  reached yet, but is still open to read and practise. Reviewing words is
   *  not the thing the journey gate is protecting. */
  unlockedWeeks: number;
  onPractice: (stop: JourneyStop) => void;
  onClose: () => void;
}) {
  const [openStop, setOpenStop] = useState<JourneyStop | null>(null);
  const words = openStop ? workshopWords(vocab, openStop) : [];

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#133e5a]/68 p-3 backdrop-blur-[3px] sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label="Review a workshop"
    >
      <div className="w-full max-w-2xl rounded-lg bg-white p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[#e35f4c]">
              {openStop ? `Week ${openStop.week}` : "Review"}
            </p>
            <h2 className="text-2xl font-black text-steppe">
              {openStop ? `${openStop.name} · ${openStop.kk}` : "Which workshop?"}
            </h2>
            <p className="mt-1 text-sm font-bold text-steppe/55">
              {openStop
                ? `${CATEGORY_LABELS[openStop.category]} · ${words.length} words. Tap a word to hear it.`
                : "Every stop on the journey has its own words. Pick one to look through them again."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-steppe/10 bg-white text-steppe shadow-sm transition hover:bg-[#fff3cf]"
          >
            <X size={18} />
          </button>
        </div>

        {openStop ? (
          <>
            <div className="mt-4 max-h-[46vh] overflow-y-auto pr-1">
              <div className="grid gap-2 sm:grid-cols-2">
                {words.map((word) => (
                  <button
                    key={word.slug}
                    type="button"
                    onClick={() => speakWord(word.kk)}
                    className="flex items-center justify-between gap-3 rounded-lg border-2 border-felt bg-white p-3 text-left transition hover:border-steppe/30 hover:bg-[#fffaf0]"
                  >
                    <span className="min-w-0">
                      <span className="block text-lg font-black leading-tight text-steppe">{word.kk}</span>
                      <span className="block text-xs font-bold text-wolf">
                        {word.latin} · {baseText(word, baseLanguage)}
                      </span>
                    </span>
                    <Volume2 size={18} className="shrink-0 text-steppe/45" />
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <Button variant="outline" size="lg" onClick={() => setOpenStop(null)}>
                <ChevronLeft size={18} /> All workshops
              </Button>
              <Button
                variant="gold"
                size="lg"
                disabled={words.length < MIN_WORDS_TO_PRACTISE}
                onClick={() => onPractice(openStop)}
              >
                Practice this workshop
              </Button>
            </div>
            {words.length < MIN_WORDS_TO_PRACTISE && (
              <p className="mt-2 text-right text-xs font-bold text-steppe/50">
                Needs at least {MIN_WORDS_TO_PRACTISE} words to make a quiz.
              </p>
            )}
          </>
        ) : (
          <div className="mt-4 max-h-[56vh] space-y-2 overflow-y-auto pr-1">
            {JOURNEY.map((stop) => {
              const count = workshopWords(vocab, stop).length;
              const reached = stop.week <= unlockedWeeks;
              return (
                <button
                  key={stop.id}
                  type="button"
                  onClick={() => setOpenStop(stop)}
                  className="flex w-full items-center gap-3 rounded-lg border-2 border-felt bg-white p-3 text-left transition hover:border-steppe/30 hover:bg-[#fffaf0]"
                >
                  <span
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-black ${
                      reached ? "bg-[#ffd84f] text-steppe" : "bg-[#e4eaee] text-steppe/45"
                    }`}
                  >
                    {reached ? stop.week : <Lock size={15} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-black leading-tight text-steppe">
                      {stop.name} <span className="text-steppe/45">· {stop.kk}</span>
                    </span>
                    <span className="block text-xs font-bold text-wolf">
                      {CATEGORY_LABELS[stop.category]} · {count} words
                      {reached ? "" : " · not reached yet"}
                    </span>
                  </span>
                  <ChevronRight size={18} className="shrink-0 text-steppe/35" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/** The way in, so Learn doesn't hand-roll the same little control. */
export function ReviewWorkshopButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="mt-1 inline-flex items-center gap-1 text-xs font-black text-steppe/60 underline decoration-dotted"
    >
      <BookOpen size={13} /> Review a workshop
    </button>
  );
}
