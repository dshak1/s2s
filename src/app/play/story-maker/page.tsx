"use client";

import { useRef, useState } from "react";
import { GameShell } from "@/components/game/game-shell";
import { Confetti } from "@/components/game/confetti";
import { Button } from "@/components/ui/button";
import { PHRASES } from "@/content/phrases";
import { VOCAB, imgFor } from "@/content/vocab";
import { store, useProfile } from "@/lib/store";
import { playCorrect } from "@/lib/audio";
import { Download, Send } from "lucide-react";

type PanelState = { img: string; phrase: number };
const PW = 300;
const PH = 340;

export default function StoryMaker() {
  const profile = useProfile();
  // image choices: kid art first, then a few vocab placeholders so it always works
  const fallback = VOCAB.slice(0, 6).map((v) => imgFor(v));
  const choices = [...profile.artifacts.map((a) => a.dataUrl), ...fallback];

  const [panels, setPanels] = useState<PanelState[]>([
    { img: choices[0], phrase: 0 },
    { img: choices[1] ?? choices[0], phrase: 1 },
    { img: choices[2] ?? choices[0], phrase: 4 },
  ]);
  const [saved, setSaved] = useState<string | null>(null);
  const [shareMsg, setShareMsg] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  function setPanel(i: number, patch: Partial<PanelState>) {
    setPanels((ps) => ps.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }

  async function compose(): Promise<string> {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#1E4D8C";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 3; i++) {
      const x = 12 + i * (PW + 12);
      ctx.fillStyle = "#FAF6E9";
      ctx.fillRect(x, 12, PW, PH);
      // image area
      const img = await loadImg(panels[i].img);
      const area = PH - 70;
      const s = Math.min(PW / img.width, area / img.height);
      const w = img.width * s;
      const h = img.height * s;
      ctx.drawImage(img, x + (PW - w) / 2, 16 + (area - h) / 2, w, h);
      // caption bar
      ctx.fillStyle = "#FFD700";
      ctx.fillRect(x, 12 + PH - 56, PW, 56);
      ctx.fillStyle = "#173c6e";
      ctx.font = "bold 26px Nunito, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(PHRASES[panels[i].phrase].kk, x + PW / 2, 12 + PH - 20, PW - 16);
    }
    return canvas.toDataURL("image/png");
  }

  async function save() {
    const url = await compose();
    store.addArtifact("story", url);
    setSaved(url);
    playCorrect();
  }
  async function download() {
    const url = saved ?? (await compose());
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-steppe-story.png";
    a.click();
  }
  function sendToParent() {
    // v1 stub: generate a shareable note the facilitator/parent can use.
    setShareMsg(
      `Story saved! In production this emails a magic link to the parent's address. For now, use Download and share the PNG.`,
    );
  }

  return (
    <GameShell title="Story Maker" kk="Әңгіме жасаушы">
      {saved && <Confetti count={50} />}
      <canvas ref={canvasRef} width={3 * PW + 4 * 12} height={PH + 24} className="hidden" />

      <p className="mb-4 text-center text-wolf">
        Build a 3-panel comic with your own art and Kazakh phrases.
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        {panels.map((panel, i) => (
          <div key={i} className="rounded-3xl bg-felt p-3">
            <div className="mb-1 text-xs font-bold text-steppe-700">Panel {i + 1}</div>
            <div className="flex h-40 items-center justify-center overflow-hidden rounded-2xl bg-warm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={panel.img} alt="" className="max-h-full max-w-full object-contain" />
            </div>
            <div className="mt-2 rounded-xl bg-gold px-2 py-1 text-center text-sm font-black text-steppe-700">
              {PHRASES[panel.phrase].kk}
            </div>

            <label className="mt-3 block text-xs font-bold text-steppe-700">Picture</label>
            <div className="mt-1 flex flex-wrap gap-1">
              {choices.slice(0, 8).map((c, ci) => (
                <button
                  key={ci}
                  onClick={() => setPanel(i, { img: c })}
                  className={`h-10 w-10 overflow-hidden rounded-lg border-2 ${panel.img === c ? "border-steppe" : "border-transparent"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>

            <label className="mt-2 block text-xs font-bold text-steppe-700">Phrase</label>
            <select
              value={panel.phrase}
              onChange={(e) => setPanel(i, { phrase: Number(e.target.value) })}
              className="mt-1 w-full rounded-xl border-2 border-steppe/20 bg-white px-2 py-1.5 font-bold text-steppe"
            >
              {PHRASES.map((p, pi) => (
                <option key={pi} value={pi}>{p.kk} — {p.en}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button variant="gold" size="lg" onClick={save}>Save my comic</Button>
        <Button variant="outline" size="lg" onClick={download}><Download size={18} /> Download</Button>
        <Button variant="primary" size="lg" onClick={sendToParent}><Send size={18} /> Send to parent</Button>
      </div>
      {shareMsg && <p className="mt-3 text-center text-sm font-bold text-steppe">{shareMsg}</p>}
      {profile.artifacts.filter((a) => a.kind === "tanba").length === 0 && (
        <p className="mt-3 text-center text-sm text-wolf">
          Tip: design an avatar first and it&apos;ll show up here as a picture choice.
        </p>
      )}
    </GameShell>
  );
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
