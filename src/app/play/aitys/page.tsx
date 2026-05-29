"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { GameShell, Scoreboard } from "@/components/game/game-shell";
import { Confetti } from "@/components/game/confetti";
import { Button } from "@/components/ui/button";
import { COUPLETS, type Couplet } from "@/content/aitys-couplets";
import { shuffle } from "@/lib/utils";
import { playCorrect, playWrong, playWin, speakWord } from "@/lib/audio";

type Mode = "cpu" | "teams";

function tilesFor(c: Couplet) {
  return shuffle([...c.answers, ...c.decoys]);
}

export default function Aitys() {
  const [started, setStarted] = useState(false);
  const [mode, setMode] = useState<Mode>("cpu");
  const [round, setRound] = useState(0);
  const [fills, setFills] = useState<(string | null)[]>([]);
  const [tiles, setTiles] = useState<string[]>([]);
  const [solved, setSolved] = useState(false);
  const [scores, setScores] = useState([0, 0]);
  const [turn, setTurn] = useState(0);

  const couplet = COUPLETS[round];

  function load(idx: number) {
    const c = COUPLETS[idx];
    setRound(idx);
    setFills(new Array(c.answers.length).fill(null));
    setTiles(tilesFor(c));
    setSolved(false);
  }
  function begin(m: Mode) {
    setMode(m);
    setStarted(true);
    setScores([0, 0]);
    setTurn(0);
    load(0);
  }

  function placeTile(word: string) {
    if (solved) return;
    const next = [...fills];
    const slot = next.findIndex((f) => f === null);
    if (slot === -1) return;
    next[slot] = word;
    setFills(next);
    if (!next.includes(null)) check(next);
  }
  function clearSlot(i: number) {
    if (solved) return;
    const next = [...fills];
    next[i] = null;
    setFills(next);
  }
  function check(filled: (string | null)[]) {
    const ok = couplet.answers.every((a, i) => a === filled[i]);
    if (ok) {
      playWin();
      speakWord(couplet.lines.join(" "));
      setSolved(true);
      setScores((s) => {
        const ns = [...s] as [number, number];
        ns[turn] += 1;
        return ns;
      });
    } else {
      playWrong();
      setTimeout(() => setFills(new Array(couplet.answers.length).fill(null)), 600);
    }
  }
  function next() {
    const ni = (round + 1) % COUPLETS.length;
    if (mode === "teams") setTurn((t) => (t === 0 ? 1 : 0));
    load(ni);
  }

  const used = useMemo(() => new Set(fills.filter(Boolean) as string[]), [fills]);

  if (!started) {
    return (
      <GameShell title="Aitys Battle" kk="Айтыс">
        <div className="mx-auto max-w-xl rounded-3xl bg-felt p-6 text-steppe-700">
          <h2 className="text-xl font-black text-steppe">What is aitys?</h2>
          <p className="mt-2">
            Aitys (айтыс) is a Kazakh tradition of improvised, rhyming poetry — two
            poets answer each other in song, line for line. Here you finish the
            couplet by choosing the word that fits <em>and</em> rhymes.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Button variant="gold" size="lg" onClick={() => begin("cpu")}>Solo vs CPU</Button>
            <Button variant="primary" size="lg" onClick={() => begin("teams")}>Two teams</Button>
          </div>
        </div>
      </GameShell>
    );
  }

  return (
    <GameShell
      title="Aitys Battle"
      kk="Айтыс"
      right={<Scoreboard label="Round" value={`${round + 1}/${COUPLETS.length}`} />}
    >
      {solved && <Confetti count={50} />}

      {mode === "teams" && (
        <div className="mb-4 flex justify-center gap-3">
          {["Team A", "Team B"].map((t, i) => (
            <div key={t} className={`rounded-2xl px-4 py-2 font-black ${turn === i ? "bg-steppe text-warm" : "bg-felt text-steppe"}`}>
              {t}: {scores[i]}
            </div>
          ))}
        </div>
      )}

      <div className="mx-auto max-w-2xl rounded-3xl bg-steppe p-6 text-warm">
        <div className="space-y-3 text-2xl font-black leading-relaxed">
          {couplet.lines.map((line, li) => {
            const parts = line.split("___");
            // count blanks before this line to map to fill index
            const before = couplet.lines.slice(0, li).reduce((n, l) => n + (l.split("___").length - 1), 0);
            let blankN = before;
            return (
              <div key={li} className="flex flex-wrap items-center gap-2">
                {parts.map((p, pi) => (
                  <span key={pi} className="flex flex-wrap items-center gap-2">
                    <span>{p}</span>
                    {pi < parts.length - 1 && (() => {
                      const idx = blankN++;
                      const val = fills[idx];
                      return (
                        <button
                          onClick={() => val && clearSlot(idx)}
                          className={`min-w-[90px] rounded-xl border-2 px-3 py-1 ${
                            val ? "border-gold bg-gold text-steppe-700" : "border-dashed border-warm/50 text-warm/40"
                          }`}
                        >
                          {val ?? "____"}
                        </button>
                      );
                    })()}
                  </span>
                ))}
              </div>
            );
          })}
        </div>

        {solved && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 rounded-2xl bg-white/10 p-4">
            <div className="font-bold text-gold">Read it aloud! ♪ (ask your facilitator)</div>
            <div className="mt-1 text-sm text-warm/90">{couplet.translation}</div>
            <div className="mt-1 text-xs text-warm/70">
              ✓ rhyme: …{couplet.answers.map((a) => a.slice(-2)).join(" / …")}
            </div>
          </motion.div>
        )}
      </div>

      {/* tile shelf */}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {tiles.map((w) => {
          const isUsed = used.has(w);
          return (
            <button
              key={w}
              disabled={isUsed || solved}
              onClick={() => placeTile(w)}
              className={`rounded-2xl px-5 py-3 text-lg font-black shadow-md transition active:scale-95 ${
                isUsed ? "bg-felt/50 text-wolf/50" : "bg-felt text-steppe hover:bg-gold/40"
              }`}
            >
              {w}
            </button>
          );
        })}
      </div>

      {solved && (
        <div className="mt-6 text-center">
          <Button variant="gold" size="lg" onClick={next}>Next couplet →</Button>
        </div>
      )}
    </GameShell>
  );
}
