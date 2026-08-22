"use client";

// "Review a workshop" — the sheet Learn opens when a kid wants the words from
// one particular session rather than the usual mix.
//
// A workshop is a session that happened on a date, and its words are whatever
// went on the board that day (src/content/workshops.ts). It is not a journey
// stop and not a vocabulary category: the sessions have not run city by city,
// so nothing here is derived from a region or a theme.
//
// Two views, one sheet: the workshops, then the terms inside one of them. The
// terms view is the review itself — every word in the group it was taught in,
// with its Latin spelling, its meaning, and a tap to hear it — and "Practice
// this workshop" hands that word list back to Learn to quiz on.

import { useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, Volume2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type VocabItem } from "@/content/vocab";
import {
  WORKSHOP_SETS,
  resolveTerms,
  workshopDateLabel,
  workshopSetTerms,
  type WorkshopSet,
} from "@/content/workshops";
import { speakWord } from "@/lib/audio";
import { baseText, type BaseLanguage } from "@/lib/lang";

/** A quiz needs an answer and two distractors, so a workshop shorter than this
 *  can be read but not practised. */
const MIN_WORDS_TO_PRACTISE = 3;

export function workshopWords(vocab: VocabItem[], set: WorkshopSet): VocabItem[] {
  return workshopSetTerms(set, vocab);
}

export function WorkshopReview({
  vocab,
  baseLanguage,
  onPractice,
  onClose,
}: {
  vocab: VocabItem[];
  baseLanguage: BaseLanguage;
  onPractice: (set: WorkshopSet) => void;
  onClose: () => void;
}) {
  // With one workshop on the books there is nothing to choose between, so the
  // sheet opens straight into it. A second one turns the list back on by
  // itself.
  const [openSet, setOpenSet] = useState<WorkshopSet | null>(
    WORKSHOP_SETS.length === 1 ? WORKSHOP_SETS[0] : null,
  );
  const onlyOne = WORKSHOP_SETS.length === 1;
  const words = openSet ? workshopWords(vocab, openSet) : [];

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
              {openSet ? `Workshop ${openSet.number} · ${workshopDateLabel(openSet.date)}` : "Review"}
            </p>
            <h2 className="text-2xl font-black text-steppe">
              {openSet ? openSet.title : "Which workshop?"}
            </h2>
            <p className="mt-1 text-sm font-bold text-steppe/55">
              {openSet
                ? `${words.length} words. Tap a word to hear it.`
                : "The words from each session, as they were taught. Pick one to look through again."}
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

        {openSet ? (
          <>
            <div className="mt-4 max-h-[46vh] space-y-4 overflow-y-auto pr-1">
              {openSet.groups.map((group) => (
                <div key={group.label}>
                  <p className="mb-2 text-xs font-black uppercase tracking-wide text-steppe/45">
                    {group.label}
                    {group.kk && <span className="ml-1.5 normal-case text-steppe/35">{group.kk}</span>}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {resolveTerms(group.terms, vocab).map((word) => (
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
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              {onlyOne ? (
                <Button variant="outline" size="lg" onClick={onClose}>
                  Not now
                </Button>
              ) : (
                <Button variant="outline" size="lg" onClick={() => setOpenSet(null)}>
                  <ChevronLeft size={18} /> All workshops
                </Button>
              )}
              <Button
                variant="gold"
                size="lg"
                disabled={words.length < MIN_WORDS_TO_PRACTISE}
                onClick={() => onPractice(openSet)}
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
            {WORKSHOP_SETS.map((set) => (
              <button
                key={set.id}
                type="button"
                onClick={() => setOpenSet(set)}
                className="flex w-full items-center gap-3 rounded-lg border-2 border-felt bg-white p-3 text-left transition hover:border-steppe/30 hover:bg-[#fffaf0]"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#ffd84f] text-sm font-black text-steppe">
                  {set.number}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-black leading-tight text-steppe">{set.title}</span>
                  <span className="block text-xs font-bold text-wolf">
                    {workshopDateLabel(set.date)} · {workshopWords(vocab, set).length} words
                  </span>
                </span>
                <ChevronRight size={18} className="shrink-0 text-steppe/35" />
              </button>
            ))}
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
