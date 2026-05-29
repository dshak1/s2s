"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { GameShell, Scoreboard } from "@/components/game/game-shell";
import { Confetti } from "@/components/game/confetti";
import { YurtSVG, YURT_TOTAL } from "@/components/yurt";
import { ALPHABET, type Letter } from "@/content/alphabet";
import { store, useProfile, masteredLetterCount } from "@/lib/store";
import { playCorrect, playWrong, speakWord } from "@/lib/audio";
import { shuffle, sample } from "@/lib/utils";
import { Volume2 } from "lucide-react";

type Script = "cyr" | "latin";

// Leitner-weighted pick: prefer letters at lower mastery levels.
function pickLetter(stats: Record<string, { level: number }>): Letter {
  const weighted: Letter[] = [];
  for (const l of ALPHABET) {
    const level = stats[l.cyr]?.level ?? 0;
    const w = Math.max(1, 6 - level); // lower level -> more tickets
    for (let i = 0; i < w; i++) weighted.push(l);
  }
  return weighted[Math.floor(Math.random() * weighted.length)];
}

export default function YurtBuilder() {
  const p = useProfile();
  const [primary, setPrimary] = useState<Script>("cyr");
  const [target, setTarget] = useState<Letter>(() => pickLetter({}));
  const [options, setOptions] = useState<Letter[]>(() => buildOptions(target));
  const [feedback, setFeedback] = useState<"none" | "right" | "wrong">("none");

  const mastered = masteredLetterCount(p);
  const justFinished = mastered >= YURT_TOTAL;

  function buildOptionsFor(t: Letter) {
    return buildOptions(t);
  }

  function nextQuestion() {
    const t = pickLetter(p.letterStats);
    setTarget(t);
    setOptions(buildOptionsFor(t));
    setFeedback("none");
  }

  function answer(opt: Letter) {
    if (feedback !== "none") return;
    const correct = opt.cyr === target.cyr;
    store.answerLetter(target.cyr, correct);
    if (correct) {
      playCorrect();
      setFeedback("right");
    } else {
      playWrong();
      setFeedback("wrong");
    }
    setTimeout(nextQuestion, 750);
  }

  const promptText = primary === "cyr" ? target.cyr : target.latin;
  const optionText = (l: Letter) => (primary === "cyr" ? l.latin : l.cyr);

  return (
    <GameShell title="Yurt Builder" kk="Үй құрушы" right={<Scoreboard label="Letters" value={`${mastered}/${YURT_TOTAL}`} />}>
      {justFinished && <Confetti />}
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex gap-2">
              {(["cyr", "latin"] as Script[]).map((s) => (
                <button
                  key={s}
                  onClick={() => { setPrimary(s); }}
                  className={`rounded-full px-3 py-1.5 text-sm font-bold ${primary === s ? "bg-steppe text-warm" : "bg-felt text-steppe"}`}
                >
                  {s === "cyr" ? "Cyrillic" : "Latin"}
                </button>
              ))}
            </div>
            <button onClick={() => speakWord(target.cyr)} className="flex items-center gap-1 rounded-full bg-gold px-3 py-1.5 text-sm font-bold text-steppe-700">
              <Volume2 size={16} /> Sound
            </button>
          </div>

          <motion.div
            key={target.cyr}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`flex h-44 items-center justify-center rounded-3xl border-4 text-7xl font-black ${
              feedback === "right" ? "border-gold bg-gold/20 text-steppe" : feedback === "wrong" ? "border-terra bg-terra/10 text-terra" : "border-steppe/30 bg-felt text-steppe"
            }`}
          >
            {promptText}
          </motion.div>
          <p className="mt-2 text-center text-sm text-wolf">
            Tap the matching {primary === "cyr" ? "Latin" : "Cyrillic"} letter
          </p>

          <div className="mt-4 grid grid-cols-3 gap-3">
            {options.map((opt) => (
              <button
                key={opt.cyr}
                onClick={() => answer(opt)}
                className="rounded-2xl bg-steppe py-6 text-3xl font-black text-warm shadow-md transition hover:bg-steppe-700 active:scale-95"
              >
                {optionText(opt)}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-felt p-4">
          <div className="mb-1 text-sm font-bold text-steppe-700">Your yurt</div>
          <YurtSVG mastered={mastered} className="w-full" />
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-steppe/15">
            <div className="h-full bg-gold transition-all" style={{ width: `${Math.min(100, (mastered / YURT_TOTAL) * 100)}%` }} />
          </div>
          <p className="mt-2 text-center text-xs text-wolf">
            {justFinished ? "Full yurt! Yurt Builder badge earned ⌂" : `${YURT_TOTAL - mastered} letters to a full yurt`}
          </p>
        </div>
      </div>
    </GameShell>
  );
}

function buildOptions(target: Letter): Letter[] {
  const others = sample(ALPHABET.filter((l) => l.cyr !== target.cyr), 2);
  return shuffle([target, ...others]);
}
