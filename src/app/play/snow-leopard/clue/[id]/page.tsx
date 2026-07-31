"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { GameShell } from "@/components/game/game-shell";
import { Confetti } from "@/components/game/confetti";
import { Button } from "@/components/ui/button";
import { CLUES } from "@/content/phrases";
import { store, useProfile } from "@/lib/store";
import { sessions } from "@/lib/sessions";
import { playCorrect, playWrong } from "@/lib/audio";
import { logAnswer } from "@/lib/telemetry";
import { itemId } from "@/lib/items";

export default function CluePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const p = useProfile();
  const clue = CLUES.find((c) => c.id === id);
  const [result, setResult] = useState<"none" | "right" | "wrong">(
    p.pawPrints.includes(id) ? "right" : "none",
  );

  if (!clue) {
    return (
      <GameShell title="Snow Leopard Patrol" kk="Қар барысы">
        <p className="text-center text-wolf">Clue not found.</p>
      </GameShell>
    );
  }

  function answer(opt: string) {
    if (result === "right") return;
    logAnswer({
      gameSlug: "snow-leopard",
      // Clues live in src/content/phrases.ts and have no content_items row yet;
      // the derived id still groups events per clue for the coverage panel.
      itemId: itemId("generated", `clue:${clue!.id}`),
      promptKind: "image",
      response: opt,
      isCorrect: opt === clue!.answer,
    });
    if (opt === clue!.answer) {
      store.addPawPrint(clue!.id);
      if (p.sessionCode) sessions.recordPaw(p.sessionCode, p.id, clue!.id);
      playCorrect();
      setResult("right");
    } else {
      playWrong();
      setResult("wrong");
    }
  }

  return (
    <GameShell title="Snow Leopard Patrol" kk="Қар барысы">
      {result === "right" && <Confetti count={50} />}
      <div className="mx-auto max-w-md rounded-3xl bg-felt p-6 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/img/${clue.imageCategory}/${clue.imageSlug}.svg`} alt="" className="mx-auto h-28 w-28" />
        <h2 className="mt-3 text-xl font-black text-steppe">{clue.prompt}</h2>

        <div className="mt-4 flex flex-col gap-2">
          {clue.options.map((opt) => (
            <button
              key={opt}
              onClick={() => answer(opt)}
              disabled={result === "right"}
              className={`rounded-2xl px-4 py-3 text-lg font-black transition active:scale-95 ${
                result === "right" && opt === clue.answer
                  ? "bg-gold text-steppe-700"
                  : "bg-steppe text-warm hover:bg-steppe-700"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>

        {result === "right" && (
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="mt-4 font-black text-terra">
            Paw print collected! ({p.pawPrints.length}/8)
          </motion.div>
        )}
        {result === "wrong" && <p className="mt-3 font-bold text-wolf">Not quite, try again!</p>}

        <div className="mt-5 flex justify-center gap-2">
          <Link href="/play/snow-leopard"><Button variant="outline">All stops</Button></Link>
          {result === "right" && <Button variant="gold" onClick={() => router.push("/play/snow-leopard")}>Next clue →</Button>}
        </div>
      </div>
    </GameShell>
  );
}
