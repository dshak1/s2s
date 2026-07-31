"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { GameShell, Scoreboard } from "@/components/game/game-shell";
import { Confetti } from "@/components/game/confetti";
import { Button } from "@/components/ui/button";
import { VOCAB, type VocabItem } from "@/content/vocab";
import { sample, shuffle } from "@/lib/utils";
import { playCorrect, playWrong, speakWord, playWin } from "@/lib/audio";
import { store } from "@/lib/store";
import { logAnswer } from "@/lib/telemetry";
import { vocabItemId } from "@/lib/items";

type Tile = { key: string; item: VocabItem; face: "en" | "kk" };

function buildBoard(pairs: number, randomize = true): Tile[] {
  const items = randomize ? sample(VOCAB, pairs) : VOCAB.slice(0, pairs);
  const tiles: Tile[] = [];
  for (const item of items) {
    tiles.push({ key: `${item.slug}-en`, item, face: "en" });
    tiles.push({ key: `${item.slug}-kk`, item, face: "kk" });
  }
  return randomize ? shuffle(tiles) : tiles;
}

export default function MemoryMatch() {
  const [pairs, setPairs] = useState(6);
  const [board, setBoard] = useState(() => buildBoard(6, false));
  const [flipped, setFlipped] = useState<string[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [moves, setMoves] = useState(0);
  const [lock, setLock] = useState(false);

  const done = matched.size === board.length && board.length > 0;
  const best = useMemo(() => {
    if (typeof window === "undefined") return null;
    const v = localStorage.getItem(`s2s_memory_best_${pairs}`);
    return v ? Number(v) : null;
  }, [pairs, done]);

  function restart(p = pairs) {
    setPairs(p);
    setBoard(buildBoard(p));
    setFlipped([]);
    setMatched(new Set());
    setMoves(0);
    setLock(false);
  }

  function flip(tile: Tile) {
    if (lock || flipped.includes(tile.key) || matched.has(tile.key)) return;
    const next = [...flipped, tile.key];
    setFlipped(next);
    if (next.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = next.map((k) => board.find((t) => t.key === k)!);
      // One event per pair attempt, keyed on the card flipped first.
      logAnswer({
        gameSlug: "memory-match",
        itemId: vocabItemId(a.item),
        promptKind: a.face === "en" ? "text" : "text",
        response: b.item.slug,
        isCorrect: a.item.slug === b.item.slug,
        attemptIndex: moves + 1,
      });
      if (a.item.slug === b.item.slug) {
        const nm = new Set(matched);
        nm.add(a.key);
        nm.add(b.key);
        setMatched(nm);
        setFlipped([]);
        speakWord(a.item.kk);
        playCorrect();
        if (nm.size === board.length) {
          playWin();
          const score = Math.max(10, pairs * 10 - (moves + 1));
          store.recordGameRun({
            game: "memory-match",
            score,
            vocabSeen: board.filter((t) => t.face === "en").map((t) => t.item.slug),
            vocabCorrect: board.filter((t) => t.face === "en").map((t) => t.item.slug),
          });
          const key = `s2s_memory_best_${pairs}`;
          const prev = Number(localStorage.getItem(key) ?? Infinity);
          if (moves + 1 < prev) localStorage.setItem(key, String(moves + 1));
        }
      } else {
        setLock(true);
        playWrong();
        setTimeout(() => {
          setFlipped([]);
          setLock(false);
        }, 800);
      }
    }
  }

  return (
    <GameShell title="Memory Match" kk="Естен қалдырма" right={<Scoreboard label="Moves" value={moves} />}>
      {done && <Confetti />}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-2">
          {[6, 8].map((p) => (
            <button
              key={p}
              onClick={() => restart(p)}
              className={`rounded-full px-3 py-1.5 text-sm font-bold ${pairs === p ? "bg-steppe text-warm" : "bg-felt text-steppe"}`}
            >
              {p} pairs
            </button>
          ))}
        </div>
        {best != null && <span className="text-sm font-bold text-wolf">Best: {best} moves</span>}
      </div>

      <div
        className="mx-auto grid max-w-3xl gap-3"
        style={{ gridTemplateColumns: `repeat(${pairs === 6 ? 4 : 4}, minmax(0,1fr))` }}
      >
        {board.map((tile) => {
          const show = flipped.includes(tile.key) || matched.has(tile.key);
          return (
            <button key={tile.key} onClick={() => flip(tile)} className="relative aspect-square [perspective:800px]">
              <motion.div
                className="relative h-full w-full [transform-style:preserve-3d]"
                animate={{ rotateY: show ? 180 : 0 }}
                transition={{ duration: 0.4 }}
              >
                {/* back */}
                <div className="felt-pattern absolute inset-0 flex items-center justify-center rounded-2xl border-4 border-gold/40 [backface-visibility:hidden]">
                  <span className="text-2xl font-black text-gold">҂</span>
                </div>
                {/* front */}
                <div
                  className={`absolute inset-0 flex items-center justify-center rounded-2xl border-4 p-2 [backface-visibility:hidden] [transform:rotateY(180deg)] ${
                    matched.has(tile.key) ? "border-gold bg-gold/20" : "border-steppe/30 bg-warm"
                  }`}
                >
                  {tile.face === "en" ? (
                    <span className="text-center text-base font-black text-steppe">{tile.item.en}</span>
                  ) : (
                    <span className="text-center text-lg font-black text-steppe">{tile.item.kk}</span>
                  )}
                </div>
              </motion.div>
            </button>
          );
        })}
      </div>

      {done && (
        <div className="mt-8 text-center">
          <p className="text-2xl font-black text-steppe">Cleared in {moves} moves!</p>
          <Button variant="gold" size="lg" className="mt-3" onClick={() => restart()}>Play again</Button>
        </div>
      )}
    </GameShell>
  );
}
