"use client";

import { useMemo, useState } from "react";
import { Minus, ShoppingBasket } from "lucide-react";
import { GameShell, Scoreboard } from "@/components/game/game-shell";
import { Confetti } from "@/components/game/confetti";
import { Button } from "@/components/ui/button";
import { VOCAB, imgFor, type VocabItem } from "@/content/vocab";
import { playCorrect, playWrong, playWin, speakWord } from "@/lib/audio";
import { store } from "@/lib/store";
import { logAnswer } from "@/lib/telemetry";
import { vocabItemId } from "@/lib/items";

type Good = {
  item: VocabItem;
  price: number;
};

type Task = {
  prompt: string;
  want: Record<string, number>;
};

const PRICE_BY_SLUG: Record<string, number> = {
  nan: 50,
  alma: 30,
  bauyrsaq: 20,
  sut: 40,
  shai: 25,
  bal: 35,
};

const TASKS: Task[] = [
  { prompt: "Buy 2 alma (apples) and 1 nan (bread).", want: { alma: 2, nan: 1 } },
  { prompt: "Buy 3 bauyrsaq and 1 shai (tea).", want: { bauyrsaq: 3, shai: 1 } },
  { prompt: "Buy 1 sut (milk) and 2 bal (honey).", want: { sut: 1, bal: 2 } },
];

function goodBySlug(goods: Good[], slug: string) {
  return goods.find((good) => good.item.slug === slug);
}

function basketTotal(goods: Good[], basket: Record<string, number>) {
  return Object.entries(basket).reduce((sum, [slug, qty]) => sum + (goodBySlug(goods, slug)?.price ?? 0) * qty, 0);
}

function exactBasket(basket: Record<string, number>, want: Record<string, number>) {
  const keys = new Set([...Object.keys(basket), ...Object.keys(want)]);
  return [...keys].every((key) => (basket[key] ?? 0) === (want[key] ?? 0));
}

export default function Bazaar() {
  const goods = useMemo<Good[]>(
    () =>
      VOCAB.filter((item) => item.category === "food" && PRICE_BY_SLUG[item.slug]).map((item) => ({
        item,
        price: PRICE_BY_SLUG[item.slug],
      })),
    [],
  );
  const [taskIndex, setTaskIndex] = useState(0);
  const [basket, setBasket] = useState<Record<string, number>>({});
  const [phase, setPhase] = useState<"shop" | "right" | "wrong" | "done">("shop");
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState("");

  const task = TASKS[taskIndex];
  const total = basketTotal(goods, basket);
  const expectedTotal = basketTotal(goods, task.want);
  const basketItems = Object.entries(basket);
  const complete = phase === "done";

  function add(slug: string) {
    if (phase !== "shop") return;
    setBasket((current) => ({ ...current, [slug]: (current[slug] ?? 0) + 1 }));
    const good = goodBySlug(goods, slug);
    if (good) speakWord(good.item.kk);
  }

  function remove(slug: string) {
    if (phase !== "shop") return;
    setBasket((current) => {
      const next = { ...current };
      if ((next[slug] ?? 0) <= 1) delete next[slug];
      else next[slug] -= 1;
      return next;
    });
  }

  function pay() {
    if (phase !== "shop") return;
    const ok = exactBasket(basket, task.want);
    // One event per vocab word the task asked for — the basket is a compound
    // answer, but item quality is only meaningful per word.
    for (const slug of Object.keys(task.want)) {
      logAnswer({
        gameSlug: "bazaar",
        itemId: vocabItemId({ slug }),
        promptKind: "text",
        response: JSON.stringify(basket),
        isCorrect: ok,
        attemptIndex: taskIndex + 1,
      });
    }
    if (ok) {
      setScore((value) => value + 1);
      setPhase("right");
      setMessage(`Дұрыс! Perfect basket: ${total} ₸.`);
      playCorrect();
      return;
    }
    setPhase("wrong");
    setMessage(`Check the basket. This task should total ${expectedTotal} ₸.`);
    playWrong();
  }

  function next() {
    if (phase === "wrong") {
      setPhase("shop");
      return;
    }
    if (taskIndex + 1 >= TASKS.length) {
      playWin();
      setPhase("done");
      store.recordGameRun({
        game: "bazaar",
        score: score * 25,
        vocabSeen: goods.map((good) => good.item.slug),
        vocabCorrect: TASKS.flatMap((entry) => Object.keys(entry.want)),
      });
      return;
    }
    setTaskIndex((value) => value + 1);
    setBasket({});
    setPhase("shop");
    setMessage("");
  }

  function replay() {
    setTaskIndex(0);
    setBasket({});
    setPhase("shop");
    setScore(0);
    setMessage("");
  }

  return (
    <GameShell
      title="Steppe Bazaar"
      kk="Базар"
      right={<Scoreboard label="₸" value={total} />}
    >
      {complete && <Confetti />}
      {complete ? (
        <div className="mx-auto max-w-xl rounded-2xl bg-steppe p-7 text-center text-warm shadow-xl">
          <div className="text-3xl font-black text-gold">Bazaar cleared!</div>
          <p className="mt-2 text-lg font-bold">{score} / {TASKS.length} baskets right · +{score * 25} points</p>
          <Button variant="gold" size="lg" className="mt-5" onClick={replay}>Replay</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <section className="flex flex-wrap items-center gap-3 rounded-2xl bg-steppe p-4 text-warm">
            <span className="rounded-full bg-gold px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-steppe-700">
              Тапсырма · Task {taskIndex + 1}/{TASKS.length}
            </span>
            <h1 className="text-xl font-black">{task.prompt}</h1>
            <span className="ml-auto text-sm font-bold text-warm/80">Tap food, count teńge, then pay.</span>
          </section>

          <section className="relative overflow-hidden rounded-2xl border border-black/5 bg-white p-4 pt-8 shadow-sm">
            <div className="absolute inset-x-0 top-0 flex h-5 overflow-hidden">
              {Array.from({ length: 24 }).map((_, index) => (
                <span key={index} className={`flex-1 ${index % 2 ? "bg-terra" : "bg-warm"}`} />
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {goods.map((good) => {
                const qty = basket[good.item.slug] ?? 0;
                return (
                  <button
                    key={good.item.slug}
                    onClick={() => add(good.item.slug)}
                    className={`relative flex min-h-40 flex-col items-center justify-center gap-2 rounded-2xl border-4 bg-white p-3 text-center transition active:scale-95 ${
                      qty ? "border-terra/80" : "border-felt"
                    }`}
                  >
                    {qty > 0 && (
                      <span
                        onClick={(event) => {
                          event.stopPropagation();
                          remove(good.item.slug);
                        }}
                        className="absolute -right-2 -top-2 inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-full bg-terra px-2 text-sm font-black text-white shadow"
                      >
                        {qty}
                        <Minus size={12} />
                      </span>
                    )}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imgFor(good.item)} alt="" className="h-14 w-14 object-contain" />
                    <div className="text-lg font-black text-steppe">{good.item.kk}</div>
                    <div className="text-xs font-bold text-wolf">{good.item.en.toLowerCase()}</div>
                    <div className="text-sm font-black text-terra">{good.price} ₸</div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="flex flex-wrap items-center gap-3 rounded-2xl bg-felt p-4">
            <div className="flex items-center gap-2 text-sm font-black text-steppe">
              <ShoppingBasket size={18} /> Basket
            </div>
            <div className="flex flex-1 flex-wrap gap-2">
              {basketItems.length === 0 ? (
                <span className="text-sm font-bold text-wolf">Empty, tap food above.</span>
              ) : (
                basketItems.map(([slug, qty]) => {
                  const good = goodBySlug(goods, slug);
                  if (!good) return null;
                  return (
                    <span key={slug} className="rounded-full bg-white px-3 py-1 text-sm font-black text-steppe">
                      {qty} × {good.item.kk} <span className="text-wolf">({qty * good.price}₸)</span>
                    </span>
                  );
                })
              )}
            </div>
            <div className="text-lg font-black text-steppe">
              Total = <span className="text-terra">{total} ₸</span>
            </div>
            {phase === "shop" ? (
              <Button variant="gold" disabled={basketItems.length === 0} onClick={pay}>Pay & check</Button>
            ) : (
              <Button onClick={next}>{phase === "wrong" ? "Try again" : taskIndex + 1 >= TASKS.length ? "Results" : "Next task"}</Button>
            )}
          </section>

          {message && (
            <p className={`rounded-2xl px-4 py-3 text-sm font-black ${phase === "right" ? "bg-green-100 text-green-800" : "bg-terra/10 text-terra"}`}>
              {message}
            </p>
          )}
        </div>
      )}
    </GameShell>
  );
}
