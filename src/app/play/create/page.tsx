"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ImagePlus,
  Play,
  Sparkles,
  Upload,
} from "lucide-react";
import { DrawingBoard } from "@/components/game/drawing-board";
import { GameShell } from "@/components/game/game-shell";
import { Button } from "@/components/ui/button";
import { GAME_TEMPLATES } from "@/content/game-templates";
import { VOCAB, VOCAB_CATEGORY_META, type VocabCategory } from "@/content/vocab";
import { resizeImageFile } from "@/lib/client-image";
import { store, useProfile } from "@/lib/store";
import { ComingSoon } from "@/components/coming-soon";
import { GAME_BUILDER_ENABLED } from "@/lib/online-features";

type BackgroundMode = "template" | "upload" | "draw" | "gallery";

const STEP_NAMES = ["Name", "Words", "World", "Launch"];

export default function CreateGamePage() {
  if (!GAME_BUILDER_ENABLED) {
    return <ComingSoon title="Build a game" detail="The game builder is getting a redesign. Check back soon." />;
  }
  return <CreateGameForm />;
}

function CreateGameForm() {
  const router = useRouter();
  const profile = useProfile();
  const fileRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState(`${profile.displayName}'s Sprint`);
  const [categories, setCategories] = useState<VocabCategory[]>(["animals"]);
  const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>("template");
  const [templateId, setTemplateId] = useState(GAME_TEMPLATES[0].id);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [drawnImage, setDrawnImage] = useState<string | null>(null);
  const [galleryArtifactId, setGalleryArtifactId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const art = profile.artifacts.filter((artifact) => artifact.kind !== "homework").slice(0, 12);

  const chosenVocab = VOCAB.filter((item) => categories.includes(item.category)).slice(0, 24);
  const selectedTemplate = GAME_TEMPLATES.find((template) => template.id === templateId);
  const selectedArtifact = profile.artifacts.find((artifact) => artifact.id === galleryArtifactId);
  const previewBackground =
    backgroundMode === "template"
      ? selectedTemplate?.image
      : backgroundMode === "upload"
        ? uploadedImage
        : backgroundMode === "gallery"
          ? selectedArtifact?.dataUrl
          : drawnImage;

  function toggleCategory(category: VocabCategory) {
    setCategories((current) => {
      if (current.includes(category)) {
        return current.length === 1 ? current : current.filter((item) => item !== category);
      }
      return [...current, category];
    });
  }

  async function onUpload(file: File | undefined) {
    if (!file) return;
    if (file.size > 12 * 1024 * 1024) {
      setUploadError("Choose an image smaller than 12 MB.");
      return;
    }
    setBusy(true);
    setUploadError(null);
    try {
      setUploadedImage(await resizeImageFile(file));
      setBackgroundMode("upload");
    } catch {
      setUploadError("That image could not be prepared. Try a PNG, JPG, or WebP file.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function createGame() {
    const game = store.createCustomGame({
      title,
      vocabSlugs: chosenVocab.map((item) => item.slug),
      backgroundDataUrl:
        backgroundMode === "upload"
          ? uploadedImage
          : backgroundMode === "draw"
            ? drawnImage
            : null,
      backgroundArtifactId: backgroundMode === "gallery" ? galleryArtifactId : null,
      backgroundTemplateId: backgroundMode === "template" ? templateId : null,
    });
    router.push(`/play/create/${game.id}`);
  }

  const canAdvance = step !== 0 || title.trim().length >= 2;

  return (
    <GameShell title="Build a Game" kk="Ойын жаса" scene="maker">
      <div className="mx-auto max-w-4xl">
        <div className="grid grid-cols-4 gap-2" aria-label="Game builder progress">
          {STEP_NAMES.map((name, index) => (
            <button
              key={name}
              type="button"
              onClick={() => index <= step && setStep(index)}
              className={`h-12 min-w-0 rounded-lg px-2 text-xs font-black transition sm:text-sm ${
                index === step
                  ? "bg-steppe text-white"
                  : index < step
                    ? "bg-[#dff0ff] text-steppe"
                    : "bg-[#edf2f5] text-steppe/45"
              }`}
            >
              <span className="hidden sm:inline">{index + 1}. </span>{name}
            </button>
          ))}
        </div>

        <div className="mt-5 min-h-[470px]">
          {step === 0 && (
            <section className="mx-auto max-w-xl py-8 text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#fff4bd] text-steppe">
                <Sparkles size={28} />
              </div>
              <label htmlFor="game-title" className="mt-5 block text-sm font-black uppercase text-steppe/55">Game name</label>
              <input
                id="game-title"
                value={title}
                maxLength={40}
                onChange={(event) => setTitle(event.target.value)}
                className="mt-2 w-full rounded-lg border-2 border-steppe/15 bg-white px-4 py-4 text-center text-2xl font-black text-steppe outline-none focus:border-[#ff9a4f]"
              />
              <div className="mt-6 grid grid-cols-3 gap-3 text-left">
                <div className="rounded-lg bg-[#dff0ff] p-3"><p className="text-xs font-black text-steppe/55">Mechanic</p><p className="font-black text-steppe">Lane runner</p></div>
                <div className="rounded-lg bg-[#fff4bd] p-3"><p className="text-xs font-black text-steppe/55">Questions</p><p className="font-black text-steppe">4 forks</p></div>
                <div className="rounded-lg bg-[#ffe1ec] p-3"><p className="text-xs font-black text-steppe/55">Players</p><p className="font-black text-steppe">Solo</p></div>
              </div>
            </section>
          )}

          {step === 1 && (
            <section>
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase text-[#e35f4c]">Vocabulary packs</p>
                  <h2 className="text-2xl font-black text-steppe">Choose the words</h2>
                </div>
                <span className="rounded-lg bg-[#fff4bd] px-3 py-2 text-sm font-black text-steppe">{chosenVocab.length} words</span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {VOCAB_CATEGORY_META.map((pack) => {
                  const selected = categories.includes(pack.key);
                  return (
                    <button
                      key={pack.key}
                      type="button"
                      onClick={() => toggleCategory(pack.key)}
                      aria-pressed={selected}
                      className={`relative min-h-28 rounded-lg border-2 p-3 text-left transition ${
                        selected ? "border-[#ff9a4f] bg-[#fff8df]" : "border-steppe/10 bg-white hover:border-steppe/25"
                      }`}
                    >
                      {selected && <Check size={17} className="absolute right-3 top-3 text-[#2f8d47]" />}
                      <p className="text-lg font-black text-steppe">{pack.en}</p>
                      <p className="text-sm font-bold text-steppe/55">{pack.kk}</p>
                      <p className="mt-3 text-xs font-bold text-steppe/45">{VOCAB.filter((item) => item.category === pack.key).length} words</p>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {step === 2 && (
            <section>
              <div className="mb-4">
                <p className="text-xs font-black uppercase text-[#e35f4c]">Stage art</p>
                <h2 className="text-2xl font-black text-steppe">Build the world</h2>
              </div>
              <div className="mb-4 grid grid-cols-4 rounded-lg bg-[#edf2f5] p-1" aria-label="Background source">
                {(["template", "upload", "draw", "gallery"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={backgroundMode === mode}
                    onClick={() => setBackgroundMode(mode)}
                    className={`rounded-md px-2 py-2 text-xs font-black capitalize transition sm:text-sm ${
                      backgroundMode === mode ? "bg-white text-steppe shadow-sm" : "text-steppe/55"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              {backgroundMode === "template" && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {GAME_TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => setTemplateId(template.id)}
                      className={`overflow-hidden rounded-lg border-2 bg-white text-left transition ${
                        templateId === template.id ? "border-[#ff9a4f]" : "border-transparent"
                      }`}
                    >
                      <Image src={template.image} alt="" width={300} height={180} className="aspect-video w-full object-cover" />
                      <span className="block px-2 py-2 text-xs font-black text-steppe">{template.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {backgroundMode === "upload" && (
                <div>
                  <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(event) => onUpload(event.target.files?.[0])} />
                  {uploadedImage ? (
                    <button type="button" onClick={() => fileRef.current?.click()} className="relative block w-full overflow-hidden rounded-lg border-2 border-steppe/15">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={uploadedImage} alt="Uploaded stage" className="aspect-video w-full object-cover" />
                      <span className="absolute bottom-3 right-3 rounded-lg bg-white/90 px-3 py-2 text-sm font-black text-steppe shadow"><ImagePlus size={16} className="mr-1 inline" /> Replace</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={busy}
                      className="grid aspect-video w-full place-items-center rounded-lg border-2 border-dashed border-steppe/25 bg-[#f4f8fb] text-steppe"
                    >
                      <span className="text-center font-black"><Upload size={30} className="mx-auto mb-2" />{busy ? "Preparing image" : "Choose an image"}</span>
                    </button>
                  )}
                  {uploadError && <p role="alert" className="mt-3 text-sm font-bold text-[#b44736]">{uploadError}</p>}
                </div>
              )}

              {backgroundMode === "draw" && <DrawingBoard canvasRef={canvasRef} onChange={setDrawnImage} />}

              {backgroundMode === "gallery" && (
                art.length > 0 ? (
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                    {art.map((artifact) => (
                      <button
                        key={artifact.id}
                        type="button"
                        onClick={() => setGalleryArtifactId(artifact.id)}
                        className={`overflow-hidden rounded-lg border-2 ${galleryArtifactId === artifact.id ? "border-[#ff9a4f]" : "border-transparent"}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={artifact.dataUrl} alt="Your artwork" className="aspect-square w-full object-cover" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="grid min-h-64 place-items-center rounded-lg border-2 border-dashed border-steppe/20 bg-[#f4f8fb] text-center text-sm font-bold text-steppe/60">
                    Your drawings will appear here.
                  </div>
                )
              )}
            </section>
          )}

          {step === 3 && (
            <section className="grid gap-5 lg:grid-cols-[1.3fr_.7fr]">
              <div
                className="relative aspect-video overflow-hidden rounded-lg bg-[#8bcde9] shadow-lg"
                style={previewBackground ? { backgroundImage: `url(${previewBackground})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
              >
                <div className="absolute inset-0 bg-black/15" />
                <div className="absolute inset-x-[10%] bottom-0 top-[18%] bg-[linear-gradient(90deg,transparent_0_3%,rgba(36,51,54,.72)_3%_97%,transparent_97%)] [clip-path:polygon(38%_0,62%_0,100%_100%,0_100%)]" />
                <div className="absolute inset-x-0 top-4 text-center">
                  <p className="text-xs font-black uppercase text-white/80">Created by {profile.displayName}</p>
                  <h2 className="text-2xl font-black text-white drop-shadow">{title}</h2>
                </div>
                <div className="absolute bottom-5 left-1/2 grid h-14 w-14 -translate-x-1/2 place-items-center rounded-full bg-[#ffd84f] text-steppe shadow-lg">
                  <Play size={24} fill="currentColor" />
                </div>
              </div>
              <div className="space-y-3">
                <div className="rounded-lg bg-[#dff0ff] p-4"><p className="text-xs font-black uppercase text-steppe/50">Words</p><p className="mt-1 text-2xl font-black text-steppe">{chosenVocab.length}</p></div>
                <div className="rounded-lg bg-[#fff4bd] p-4"><p className="text-xs font-black uppercase text-steppe/50">Forks</p><p className="mt-1 text-2xl font-black text-steppe">4</p></div>
                <Button variant="gold" size="lg" className="w-full" onClick={createGame}>
                  <Play size={18} /> Create and play
                </Button>
              </div>
            </section>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-steppe/10 pt-4">
          <Button variant="ghost" onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0}>
            <ArrowLeft size={17} /> Back
          </Button>
          {step < STEP_NAMES.length - 1 && (
            <Button variant="gold" onClick={() => setStep((value) => Math.min(STEP_NAMES.length - 1, value + 1))} disabled={!canAdvance}>
              Next <ArrowRight size={17} />
            </Button>
          )}
        </div>
      </div>
    </GameShell>
  );
}
