"use client";

import { useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { GameShell, Scoreboard } from "@/components/game/game-shell";
import { Confetti } from "@/components/game/confetti";
import { Button } from "@/components/ui/button";
import { REGIONS } from "@/content/regions";
import { playCorrect, playWrong, playWin } from "@/lib/audio";
import { shuffle } from "@/lib/utils";
import { store } from "@/lib/store";
import { logAnswer } from "@/lib/telemetry";
import { placeItemId } from "@/lib/items";

type Place = {
  id: string;
  name: string;
  kk: string;
  x: number;
  y: number;
  fact: string;
  hue: string;
  sky: [string, string];
};

const PLACES: Place[] = [
  ...REGIONS.map((region) => ({
    ...region,
    hue: region.id === "charyn" ? "#c8102e" : region.id === "mangystau" ? "#cdb98e" : "#3f7d4f",
    sky: ["#dcecf6", "#f6efd8"] as [string, string],
  })),
  {
    id: "burabay",
    name: "Burabay",
    kk: "Бурабай",
    x: 579,
    y: 97,
    hue: "#3f7d4f",
    sky: ["#bfe0f2", "#eaf6e0"],
    fact: "Burabay is known for pine forests, blue lakes, and the Okzhetpes rock.",
  },
  {
    id: "aktau",
    name: "Aktau",
    kk: "Ақтау",
    x: 123,
    y: 474,
    hue: "#d6c39b",
    sky: ["#dbeef6", "#f7efd8"],
    fact: "Aktau sits by the Caspian Sea. Its name means white mountain.",
  },
];

const TOTAL = 5;

function PlacePhoto({ place }: { place: Place }) {
  return (
    <svg viewBox="0 0 600 440" className="h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={`sky-${place.id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={place.sky[0]} />
          <stop offset="1" stopColor={place.sky[1]} />
        </linearGradient>
      </defs>
      <rect width="600" height="440" fill={`url(#sky-${place.id})`} />
      <circle cx="475" cy="95" r="42" fill="#ffffff" opacity="0.55" />
      <path d="M0 300 L90 200 L150 260 L240 170 L320 250 L400 180 L500 270 L600 210 V440 H0 Z" fill={place.hue} opacity="0.85" />
      <path d="M0 360 L120 285 L210 335 L320 265 L430 335 L540 285 L600 325 V440 H0 Z" fill={place.hue} opacity="0.62" />
      <path d="M0 405 L160 355 L320 395 L480 350 L600 385 V440 H0 Z" fill={place.hue} opacity="0.9" />
    </svg>
  );
}

export default function WhereKz() {
  const [order, setOrder] = useState(() => PLACES.slice(0, TOTAL));
  const [index, setIndex] = useState(0);
  const [pin, setPin] = useState<{ x: number; y: number } | null>(null);
  const [phase, setPhase] = useState<"guess" | "revealed" | "done">("guess");
  const [found, setFound] = useState(0);
  const [correctIds, setCorrectIds] = useState<string[]>([]);
  const [closenessTotal, setClosenessTotal] = useState(0);
  const [lastClose, setLastClose] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);
  // Telemetry: when the current place photo was first shown.
  const shownAt = useRef(Date.now());

  const place = order[index];
  const complete = phase === "done";

  function dropPin(event: React.PointerEvent<SVGSVGElement>) {
    if (phase !== "guess" || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    setPin({
      x: ((event.clientX - rect.left) / rect.width) * 1000,
      y: ((event.clientY - rect.top) / rect.height) * 600,
    });
  }

  function guess() {
    if (!pin || phase !== "guess") return;
    const distance = Math.hypot(pin.x - place.x, pin.y - place.y);
    const close = Math.max(0, Math.round(100 - distance / 4.5));
    logAnswer({
      gameSlug: "where-kz",
      itemId: placeItemId(place),
      promptKind: "map",
      // Where the pin landed, so a systematically mis-taught place shows up as a
      // cluster rather than just a low score.
      response: `${Math.round(pin.x)},${Math.round(pin.y)}`,
      isCorrect: distance < 100,
      latencyMs: Date.now() - shownAt.current,
      attemptIndex: index + 1,
    });
    setLastClose(close);
    setClosenessTotal((total) => total + close);
    if (distance < 100) {
      setFound((value) => value + 1);
      setCorrectIds((ids) => [...ids, place.id]);
      playCorrect();
    } else {
      playWrong();
    }
    setPhase("revealed");
  }

  function next() {
    if (index + 1 >= TOTAL) {
      playWin();
      setPhase("done");
      store.recordGameRun({
        game: "where-kz",
        score: Math.round(closenessTotal / 10),
        vocabSeen: order.map((item) => item.id),
        vocabCorrect: correctIds,
      });
      return;
    }
    setIndex((value) => value + 1);
    setPin(null);
    setPhase("guess");
    shownAt.current = Date.now();
  }

  function replay() {
    setOrder(shuffle(PLACES).slice(0, TOTAL));
    setIndex(0);
    setPin(null);
    setPhase("guess");
    setFound(0);
    setCorrectIds([]);
    setClosenessTotal(0);
    setLastClose(0);
  }

  return (
    <GameShell
      title="Where in Kazakhstan?"
      kk="Қайда?"
      right={<Scoreboard label="Round" value={`${Math.min(index + 1, TOTAL)}/${TOTAL}`} />}
    >
      {complete && <Confetti />}
      {complete ? (
        <div className="mx-auto max-w-xl rounded-2xl bg-steppe p-7 text-center text-warm shadow-xl">
          <div className="text-3xl font-black text-gold">Journey done!</div>
          <p className="mt-2 text-lg font-bold">
            {found} / {TOTAL} places close · +{Math.round(closenessTotal / 10)} points
          </p>
          <Button variant="gold" size="lg" className="mt-5" onClick={replay}>Replay</Button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
          <section className="flex min-h-[420px] flex-col">
            <div className="mb-2 flex items-center gap-2 text-xl font-black text-steppe">
              <MapPin className="text-terra" /> Where is this place?
            </div>
            <div className="relative min-h-[360px] flex-1 overflow-hidden rounded-2xl shadow-xl shadow-steppe/15">
              <PlacePhoto place={place} />
              <div className="absolute left-3 top-3 rounded-lg bg-black/55 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-warm">
                Photo placeholder · add real photos later
              </div>
              {phase === "revealed" && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-steppe-700 to-transparent p-5 pt-20 text-warm">
                  <div className="text-3xl font-black">
                    {place.name} · <span className="text-gold">{place.kk}</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold leading-5 text-warm/90">{place.fact}</p>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-black/5 bg-white p-3 shadow-sm">
            <p className="mb-2 text-sm font-bold text-wolf">
              {phase === "guess" ? "Tap the map to drop your pin." : "The green dot is the real location."}
            </p>
            <svg
              ref={svgRef}
              viewBox="0 0 1000 600"
              className="h-[420px] w-full touch-none rounded-xl bg-[#f2f0e6]"
              onPointerDown={dropPin}
              aria-label="Map of Kazakhstan"
            >
              {/* Real map, drawn to a known projection: left edge 46E, right 88E,
                  top 55.5N, bottom 40.5N. Every pin coordinate in regions.ts is
                  computed from that box, so a place sits where it actually is. */}
              <image href="/img/where-in-kz.png" x="0" y="0" width="1000" height="600" preserveAspectRatio="none" />
              {PLACES.map((item) => (
                <circle key={item.id} cx={item.x} cy={item.y} r="6" fill="rgba(30,77,140,.18)" />
              ))}
              {pin && (
                <g transform={`translate(${pin.x},${pin.y})`}>
                  <circle r="26" fill="rgba(200,16,46,.16)" />
                  <path d="M0 8 C-14 -10 -10 -28 0 -28 C10 -28 14 -10 0 8 Z" fill="#c8102e" stroke="#fff" strokeWidth="3" />
                  <circle cx="0" cy="-19" r="5" fill="#fff" />
                </g>
              )}
              {phase === "revealed" && (
                <g>
                  {pin && <line x1={pin.x} y1={pin.y} x2={place.x} y2={place.y} stroke="#1e4d8c" strokeWidth="3" strokeDasharray="6 7" />}
                  <circle cx={place.x} cy={place.y} r="12" fill="#1c7a4a" stroke="#fff" strokeWidth="4" />
                  <text x={place.x} y={place.y - 20} textAnchor="middle" fontWeight="900" fontSize="22" fill="#1c7a4a">
                    {place.name}
                  </text>
                </g>
              )}
            </svg>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-wolf">
                {phase === "guess" ? (pin ? "Pin dropped." : "No pin yet.") : <>Closeness: <b className={lastClose > 70 ? "text-green-700" : "text-terra"}>{lastClose}%</b></>}
              </span>
              {phase === "guess" ? (
                <Button variant="gold" disabled={!pin} onClick={guess}>Guess</Button>
              ) : (
                <Button onClick={next}>{index + 1 >= TOTAL ? "Results" : "Next place"}</Button>
              )}
            </div>
          </section>
        </div>
      )}
    </GameShell>
  );
}
