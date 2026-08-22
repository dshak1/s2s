"use client";

// Kazakh Colours — the quiz half of Learn narrowed to one category, plus a
// design mode. The teaching move here is different from every other word game:
// a colour is the one kind of word you can put on screen *as itself*, so the
// prompt is a plain swatch and the answer is the Kazakh word for it.
//
// The customisable part is the point, not decoration. Before playing, a kid
// presses Design and gets the real board with every picture slot open: a photo
// on each word card (their white cat for Ақ), a backdrop, and any extra pieces
// they want to drag in. Card photos are stored per *word*, in the same
// profile.vocabHints Falling Words already reads, so a picture attached here
// follows that word through the rest of the app.

import { useCallback, useMemo, useRef, useState } from "react";
import { ImagePlus, Palette, RotateCcw, Volume2 } from "lucide-react";
import { Confetti } from "@/components/game/confetti";
import { GameShell, Scoreboard } from "@/components/game/game-shell";
import { GameStatsLine } from "@/components/game/game-stats-line";
import {
  InsertPicturesPanel,
  SceneDesignBar,
  ScenePieceLayer,
  useSceneDesign,
  type SceneSlot,
} from "@/components/game/scene-pictures";
import { ReportQuestion } from "@/components/report-question";
import { Button } from "@/components/ui/button";
import { type VocabItem } from "@/content/vocab";
import { playCorrect, playWin, playWrong, speakWord } from "@/lib/audio";
import { resizeImageFile } from "@/lib/client-image";
import { vocabItemId } from "@/lib/items";
import { baseText, type BaseLanguage } from "@/lib/lang";
import { store, useProfile } from "@/lib/store";
import { logAnswer } from "@/lib/telemetry";
import { shuffle } from "@/lib/utils";
import { useVocab } from "@/lib/vocab-packs";

const SLUG = "tuster";
const TOTAL = 8;
const START_LIVES = 3;

/** The actual colour behind each word. A colour word without one of these
 *  can't be asked as a swatch, so the pool below drops it — a custom pack
 *  filed under "colors" gets skipped here rather than asked unanswerably. */
const COLOUR_HEX: Record<string, string> = {
  qyzyl: "#d1372f",
  kok: "#2f6fd1",
  sary: "#f2c230",
  zhasyl: "#2f8d47",
  aq: "#ffffff",
  qara: "#1b1b1b",
  qongyr: "#8a5a2b",
  sur: "#9aa5ad",
};

/** The scene has no built-in furniture to swap — a quiz board is not a steppe
 *  — so the only fixed slot is the backdrop. Everything else a kid puts on the
 *  board is a piece they added themselves. */
const SCENE_SLOTS: SceneSlot[] = [
  { key: "board", label: "Backdrop", hint: "The picture behind the whole board", x: 50, y: 50, width: 0, target: "background" },
];

/** Photos here are shared with Falling Words, which paints a vocab hint
 *  full-bleed behind its play field — so they're stored bigger than the 300px
 *  a card of this size would need on its own. */
const PHOTO_MAX_EDGE = 640;

type Phase = "ready" | "guess" | "right" | "wrong" | "done";
type Round = { answer: VocabItem; options: VocabItem[] };

function buildRound(deckRef: { current: VocabItem[] }, posRef: { current: number }, pool: VocabItem[]): Round {
  // Deal from a shuffled, non-repeating copy so eight rounds are eight
  // different colours rather than the same three coming round again.
  if (posRef.current >= deckRef.current.length) {
    deckRef.current = shuffle(pool);
    posRef.current = 0;
  }
  const answer = deckRef.current[posRef.current];
  posRef.current += 1;
  const distractors = shuffle(pool.filter((item) => item.slug !== answer.slug)).slice(0, 2);
  return { answer, options: shuffle([answer, ...distractors]) };
}

export default function KazakhColours() {
  const profile = useProfile();
  const vocab = useVocab();
  const pool = useMemo(
    () => vocab.filter((item) => item.category === "colors" && COLOUR_HEX[item.slug]),
    [vocab],
  );

  const [phase, setPhase] = useState<Phase>("ready");
  const [roundIndex, setRoundIndex] = useState(0);
  const [round, setRound] = useState<Round | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [lives, setLives] = useState(START_LIVES);
  const [score, setScore] = useState(0);
  const [burst, setBurst] = useState(false);

  const deck = useRef<VocabItem[]>([]);
  const deckPos = useRef(0);
  const seenSlugs = useRef<Set<string>>(new Set());
  const correctSlugs = useRef<Set<string>>(new Set());
  // Stamped when a round is actually shown, not at mount — reading the clock
  // during render is impure and the value would be wrong anyway, since the
  // start screen sits here for as long as the kid wants.
  const shownAt = useRef(0);
  const audioPlays = useRef(0);

  // Destructured, not kept as `design.x`: the react-hooks lint reads a
  // `.sceneRef` property access in JSX as touching a ref during render.
  const { designing, selectedId, setSelectedId, sceneRef, pieces, start: startDesign, stop: stopDesign } =
    useSceneDesign(SLUG);
  const background = profile.gameBackgrounds[SLUG] ?? null;

  // The board a kid designs is the board they play, so design mode shows a real
  // round rather than a mock-up of one. It's a fixed trio (the screenshot's Ақ /
  // Қоңыр / Сары where those exist) so the slots don't reshuffle underneath a
  // kid halfway through adding photos to them.
  const sampleRound = useMemo<Round | null>(() => {
    if (pool.length < 3) return null;
    const wanted = ["aq", "qongyr", "sary"]
      .map((slug) => pool.find((item) => item.slug === slug))
      .filter((item): item is VocabItem => Boolean(item));
    const options = [...wanted, ...pool.filter((item) => !wanted.includes(item))].slice(0, 3);
    return { answer: options[options.length - 1], options };
  }, [pool]);

  const finish = useCallback((finalScore: number) => {
    setPhase("done");
    playWin();
    store.recordGameRun({
      game: SLUG,
      score: finalScore * 12,
      vocabSeen: [...seenSlugs.current],
      vocabCorrect: [...correctSlugs.current],
    });
  }, []);

  function startRun() {
    deck.current = [];
    deckPos.current = 0;
    seenSlugs.current = new Set();
    correctSlugs.current = new Set();
    setRound(buildRound(deck, deckPos, pool));
    setRoundIndex(0);
    setPicked(null);
    setLives(START_LIVES);
    setScore(0);
    setPhase("guess");
    shownAt.current = Date.now();
    audioPlays.current = 0;
  }

  function check() {
    if (!round || !picked || phase !== "guess") return;
    const correct = picked === round.answer.slug;
    seenSlugs.current.add(round.answer.slug);
    if (correct) correctSlugs.current.add(round.answer.slug);
    store.trackMistake(vocabItemId(round.answer), correct);
    logAnswer({
      gameSlug: SLUG,
      itemId: vocabItemId(round.answer),
      // The prompt is the colour itself, not the word for it.
      promptKind: "image",
      response: picked,
      isCorrect: correct,
      latencyMs: Date.now() - shownAt.current,
      attemptIndex: roundIndex + 1,
      audioPlays: audioPlays.current,
    });
    if (correct) {
      setScore(score + 1);
      setPhase("right");
      setBurst(true);
      playCorrect();
      window.setTimeout(() => setBurst(false), 900);
      return;
    }
    const nextLives = Math.max(0, lives - 1);
    setLives(nextLives);
    setPhase("wrong");
    playWrong();
    if (nextLives === 0) window.setTimeout(() => finish(score), 500);
  }

  function next() {
    if (roundIndex + 1 >= TOTAL) {
      finish(score);
      return;
    }
    setRoundIndex(roundIndex + 1);
    setRound(buildRound(deck, deckPos, pool));
    setPicked(null);
    setPhase("guess");
    shownAt.current = Date.now();
    audioPlays.current = 0;
  }

  function say(item: VocabItem) {
    audioPlays.current += 1;
    speakWord(item.kk);
  }

  // Both design mode and the start screen borrow the real board — pressing
  // Design should change what you can *do* to the board in front of you, not
  // swap one screen for another — so both draw the fixed sample round. Once
  // play starts, each round brings its own.
  const shown = designing || phase === "ready" ? sampleRound : round;

  return (
    <GameShell title="Kazakh Colours" kk="Түстер" right={<Scoreboard label="♥" value={`${lives}`} />}>
      {burst && <Confetti count={45} />}

      {phase === "done" ? (
        <div className="mx-auto max-w-xl rounded-2xl bg-steppe p-7 text-center text-warm shadow-xl">
          <div className="text-3xl font-black text-gold">Round complete!</div>
          <p className="mt-2 text-lg font-bold">{score} / {TOTAL} correct · +{score * 12} points</p>
          <div className="mt-3"><GameStatsLine slug={SLUG} /></div>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Button variant="gold" size="lg" onClick={startRun}>Play again</Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                setPhase("ready");
                startDesign();
              }}
            >
              <Palette size={18} /> Design
            </Button>
            <Button variant="outline" size="lg" onClick={() => history.back()}>Back</Button>
          </div>
        </div>
      ) : pool.length < 3 ? (
        <p className="py-10 text-center font-bold text-steppe/60">No colour words available.</p>
      ) : (
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
          <div
            ref={sceneRef}
            // Tapping anywhere that isn't a picture drops the selection, so the
            // size slider never stays pointed at something the kid has stopped
            // thinking about. A piece stops the event itself (see
            // ScenePieceView), and the cards keep their own taps either way —
            // an overlay would have swallowed the upload buttons.
            onPointerDown={designing ? () => setSelectedId(null) : undefined}
            className="relative overflow-hidden rounded-lg border border-steppe/10 bg-white/70 bg-cover bg-center p-4 shadow-inner sm:p-6"
            style={background ? { backgroundImage: `url(${background})` } : undefined}
          >
            {/* A photo backdrop sits behind dark text and small type, so it
                always gets a wash — without it a busy picture makes the whole
                board unreadable and the kid has no way to see that coming
                while they're choosing the photo. */}
            {background && <div className="pointer-events-none absolute inset-0 bg-white/60" />}

            <div className="relative z-10 flex flex-col items-center gap-5">
              {phase !== "ready" && !designing && (
                <div className="h-3 w-full overflow-hidden rounded-full bg-felt">
                  <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${(roundIndex / TOTAL) * 100}%` }} />
                </div>
              )}

              <div className="text-center">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-terra">Kazakh colours</p>
                <h1 className="mt-1 text-2xl font-black text-steppe sm:text-3xl">Which colour is this?</h1>
              </div>

              {shown && (
                <>
                  <div className="flex items-center gap-3">
                    <div
                      className="h-24 w-40 rounded-2xl ring-2 ring-inset ring-steppe/15 shadow-[3px_4px_0_0_rgba(19,62,90,.18)] sm:h-28 sm:w-56"
                      style={{ background: COLOUR_HEX[shown.answer.slug] }}
                      aria-label="The colour to name"
                      role="img"
                    />
                    <button
                      type="button"
                      onClick={() => say(shown.answer)}
                      disabled={designing}
                      aria-label="Hear the answer"
                      className="grid h-14 w-14 place-items-center rounded-full bg-steppe text-gold shadow-[3px_4px_0_0_#122e57] transition active:scale-95 disabled:opacity-40"
                    >
                      <Volume2 size={26} />
                    </button>
                  </div>

                  <div className="grid w-full gap-3 sm:grid-cols-3">
                    {shown.options.map((option) => (
                      <ColourCard
                        key={option.slug}
                        item={option}
                        photo={profile.vocabHints[option.slug] ?? null}
                        designing={designing}
                        selected={picked === option.slug}
                        reveal={phase === "right" || phase === "wrong"}
                        correct={option.slug === shown.answer.slug}
                        baseLanguage={profile.baseLanguage}
                        onPick={() => {
                          if (designing) return;
                          if (phase === "guess") setPicked(option.slug);
                          else say(option);
                        }}
                      />
                    ))}
                  </div>

                  <div className="min-h-12">
                    {designing ? null : phase === "guess" ? (
                      <Button variant="gold" size="lg" disabled={!picked} onClick={check}>Check</Button>
                    ) : phase === "ready" ? (
                      <div className="flex flex-wrap justify-center gap-3">
                        <Button variant="gold" size="lg" onClick={startRun}>Play</Button>
                        <Button variant="outline" size="lg" onClick={startDesign}>
                          <Palette size={18} /> Design
                        </Button>
                      </div>
                    ) : (
                      <Button variant={phase === "right" ? "primary" : "gold"} size="lg" onClick={next}>
                        {roundIndex + 1 >= TOTAL ? "See results" : "Next"}
                      </Button>
                    )}
                  </div>

                  <div className="rounded-2xl bg-felt px-4 py-3 text-center text-sm font-bold text-steppe-700">
                    {phase === "wrong"
                      ? `The answer was “${shown.answer.kk}”, ${baseText(shown.answer, profile.baseLanguage)}.`
                      : phase === "right"
                        ? `“${shown.answer.kk}” · ${baseText(shown.answer, profile.baseLanguage)}.`
                        : designing
                          ? "This is your board. Tap a card to put your own photo on that colour."
                          : "Meaning appears after you check."}
                  </div>
                </>
              )}

              {phase !== "ready" && phase !== "guess" && round && (
                <ReportQuestion itemId={vocabItemId(round.answer)} gameSlug={SLUG} />
              )}
            </div>

            <ScenePieceLayer
              slug={SLUG}
              slots={SCENE_SLOTS}
              pieces={pieces}
              editing={designing}
              selectedId={selectedId}
              onSelect={setSelectedId}
              boundsRef={sceneRef}
            />

          </div>

          {designing && (
            <SceneDesignBar
              slug={SLUG}
              slots={SCENE_SLOTS}
              pieces={pieces}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onDone={stopDesign}
              placement="inline"
            />
          )}

          {designing && (
            <InsertPicturesPanel
              slug={SLUG}
              slots={SCENE_SLOTS}
              pieces={pieces}
              background={background}
              copy="Swap the backdrop, or add pictures of your own — a tree, your dog, anything. Drag them around the board above."
            />
          )}
        </div>
      )}
    </GameShell>
  );
}

/**
 * One answer card. During play it is a button showing the Kazakh word and,
 * once a kid has attached one, their photo for it. In design mode the photo
 * area opens the file picker instead — this is the "Upload a photo" the whole
 * feature is named after.
 */
function ColourCard({
  item,
  photo,
  designing,
  selected,
  reveal,
  correct,
  baseLanguage,
  onPick,
}: {
  item: VocabItem;
  photo: string | null;
  designing: boolean;
  selected: boolean;
  reveal: boolean;
  correct: boolean;
  baseLanguage: BaseLanguage;
  onPick: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(false);
    try {
      store.setVocabHint(item.slug, await resizeImageFile(file, PHOTO_MAX_EDGE));
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={`relative rounded-2xl border-4 bg-white p-4 text-center shadow-[3px_4px_0_0_rgba(19,62,90,.12)] transition ${
        reveal && correct
          ? "border-green-600"
          : reveal && selected
            ? "border-terra"
            : selected
              ? "border-steppe"
              : "border-felt"
      }`}
    >
      <button
        type="button"
        onClick={onPick}
        disabled={designing}
        className="w-full disabled:cursor-default"
      >
        <div className="text-4xl font-black text-steppe sm:text-5xl">{item.kk}</div>
        <div className="mt-1 text-sm font-bold text-wolf">{item.latin}</div>
        {reveal && <div className="mt-1 text-sm font-black text-wolf">{baseText(item, baseLanguage)}</div>}
      </button>

      {/* No photo and not designing: the card is just the word. An empty
          placeholder during play would be a hole in the board, and a coloured
          one would hand over the answer. */}
      {designing ? (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            onChange={(event) => {
              void onFile(event.target.files?.[0]);
              event.currentTarget.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="mt-3 grid h-24 w-full place-items-center overflow-hidden rounded-lg border-2 border-dashed border-steppe/25 bg-[#f4f8fb] text-steppe transition hover:border-steppe/50 disabled:opacity-50"
          >
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="" className="h-24 w-full object-cover" />
            ) : (
              <span className="flex flex-col items-center gap-1 text-xs font-black">
                <ImagePlus size={20} className="text-steppe/40" />
                {busy ? "Adding…" : "Upload a photo"}
              </span>
            )}
          </button>
          {photo && (
            <button
              type="button"
              onClick={() => store.clearVocabHint(item.slug)}
              title={`Remove the photo for ${item.kk}`}
              aria-label={`Remove the photo for ${item.kk}`}
              className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-white text-steppe shadow-sm ring-1 ring-steppe/15 hover:bg-[#fff3cf]"
            >
              <RotateCcw size={12} />
            </button>
          )}
          {error && <p role="alert" className="mt-1 text-[11px] font-bold text-[#b44736]">That image would not load.</p>}
        </>
      ) : (
        photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className="mt-3 h-24 w-full rounded-lg object-cover" />
        )
      )}
    </div>
  );
}
