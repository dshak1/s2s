"use client";

import { useActionState, useRef, useState } from "react";
import { Check, ChevronRight, Loader2, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VoiceNote, type VoiceNoteResult } from "@/components/voice-note";
import { saveLabel, type LabelResult } from "./actions";

export type QueueItem = {
  item_id: string;
  kind: string;
  ref_slug: string;
  game_slug: string | null;
  payload: Record<string, unknown>;
  attempts: number;
  p_value: number | null;
  task_id: string | null;
  origin: string | null;
  uncertainty_reason: string | null;
};

const EMPTY: LabelResult = { ok: false };

const AXES = [
  { key: "clarity", label: "Clear", hint: "1 = confusing · 5 = obvious what's being asked" },
  { key: "difficulty", label: "Difficulty", hint: "1 = far too easy · 5 = far too hard" },
  {
    key: "cultural_accuracy",
    label: "Culturally right",
    hint: "1 = wrong or odd in Kazakh · 5 = exactly how it's said",
  },
  { key: "answer_correct", label: "Answer correct", hint: "1 = the marked answer is wrong · 5 = right" },
  {
    key: "distractor_quality",
    label: "Wrong options",
    hint: "1 = giveaways or unfair · 5 = plausible and fair",
  },
] as const;

const REASON_LABELS: Record<string, string> = {
  too_hard_in_practice: "Learners almost never get this right",
  too_easy_in_practice: "Nearly everyone gets this right",
  difficulty_unknown: "Generated, difficulty unverified",
  cultural_accuracy_unverified: "Generated, needs a native speaker",
  distractors_weak: "Generated, wrong options may be weak",
  image_layout_unchecked: "Generated, layout not eyeballed",
  audio_pronunciation_unverified: "Generated audio, pronunciation unverified",
  translation_ambiguous: "Generated, translation may be ambiguous",
};

function ItemPreview({ item }: { item: QueueItem }) {
  const p = item.payload as {
    kk?: string;
    en?: string;
    latin?: string;
    cyr?: string;
    name?: string;
    fact?: string;
    audio?: string | null;
    image?: string;
    category?: string;
  };

  const audio = p.audio ?? null;
  const main = p.kk ?? p.cyr ?? p.name ?? item.ref_slug;
  const gloss = p.en ?? p.fact ?? "";

  return (
    <div className="rounded-2xl bg-warm p-6 text-center">
      {p.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.image} alt="" className="mx-auto mb-3 h-24 w-24" />
      )}
      <p className="text-3xl font-black text-steppe">{main}</p>
      {p.latin && <p className="mt-1 text-sm font-bold text-wolf">{p.latin}</p>}
      {gloss && <p className="mt-2 text-sm font-semibold text-wolf">{gloss}</p>}
      {audio && (
        <button
          type="button"
          onClick={() => void new Audio(audio).play().catch(() => {})}
          className="mx-auto mt-3 inline-flex items-center gap-1.5 rounded-full bg-steppe px-4 py-2 text-sm font-black text-gold transition hover:bg-steppe-700"
        >
          <Volume2 size={14} /> Play the clip
        </button>
      )}
      {!audio && (item.kind === "letter" || item.kind === "vocab" || item.kind === "greeting") && (
        <p className="mt-3 text-xs font-black text-terra">No audio clip exists for this one.</p>
      )}
    </div>
  );
}

function AxisRow({ axis }: { axis: (typeof AXES)[number] }) {
  return (
    <fieldset className="flex flex-wrap items-center justify-between gap-2">
      <legend className="sr-only">{axis.label}</legend>
      <div className="min-w-0">
        <span className="text-sm font-black text-steppe">{axis.label}</span>
        <p className="text-xs font-semibold text-wolf/70">{axis.hint}</p>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <label
            key={n}
            className="cursor-pointer rounded-lg bg-felt px-3 py-1.5 text-sm font-black text-wolf transition hover:bg-gold/20 has-[:checked]:bg-steppe has-[:checked]:text-white"
          >
            <input type="radio" name={axis.key} value={n} defaultChecked={n === 3} className="sr-only" />
            {n}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function LabelQueue({ items }: { items: QueueItem[] }) {
  const [index, setIndex] = useState(0);
  const [verdict, setVerdict] = useState<"good" | "bad" | "unsure">("good");
  const [reason, setReason] = useState("");
  const [voicePath, setVoicePath] = useState<string>("");
  const [transcript, setTranscript] = useState<string>("");
  const [state, action, pending] = useActionState(saveLabel, EMPTY);
  // Time-to-judge, measured from the rater's first interaction with this item
  // rather than from render, so a tab left open overnight doesn't report a
  // twelve-hour label. Both refs are written in event handlers, never in render.
  const startedAt = useRef(0);
  const msField = useRef<HTMLInputElement>(null);

  const item = items[index];
  const done = !item;
  // True only for the item the last successful save was about, so advancing
  // clears it without any state write.
  const saved = Boolean(state.ok && item && state.itemId === item.item_id);

  function advance() {
    setIndex((i) => i + 1);
    setVerdict("good");
    setReason("");
    setVoicePath("");
    setTranscript("");
    startedAt.current = 0;
  }

  function markStart() {
    if (!startedAt.current) startedAt.current = Date.now();
  }

  function stampElapsed() {
    if (msField.current) {
      msField.current.value = startedAt.current ? String(Date.now() - startedAt.current) : "";
    }
  }

  function onVoice(result: VoiceNoteResult) {
    setVoicePath(result.path ?? "");
    setTranscript(result.transcript);
    if (result.transcript) {
      setReason((r) => (r ? `${r} ${result.transcript}` : result.transcript));
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl bg-white p-10 text-center shadow ring-1 ring-black/5">
        <Check size={40} className="mx-auto mb-3 text-green-600" />
        <p className="text-lg font-black text-steppe">Queue clear.</p>
        <p className="mt-1 text-sm font-semibold text-wolf">
          You&apos;ve judged everything waiting for you. Refresh later, new questions
          arrive as kids play and as content is generated.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow ring-1 ring-black/5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-black uppercase tracking-wider text-wolf">
          {index + 1} of {items.length} waiting · {item.kind}
          {item.game_slug ? ` · ${item.game_slug}` : ""}
        </span>
        {item.attempts > 0 && (
          <span className="text-xs font-bold text-wolf">
            {item.attempts} learner answer{item.attempts === 1 ? "" : "s"}
            {item.p_value !== null && ` · ${Math.round(item.p_value * 100)}% correct`}
          </span>
        )}
      </div>

      {item.uncertainty_reason && (
        <p className="mb-3 rounded-xl bg-gold/20 px-3 py-2 text-xs font-black text-steppe-700">
          Flagged: {REASON_LABELS[item.uncertainty_reason] ?? item.uncertainty_reason}
        </p>
      )}

      <ItemPreview item={item} />

      <form
        action={action}
        onSubmit={stampElapsed}
        onPointerDownCapture={markStart}
        onKeyDownCapture={markStart}
        className="mt-5 space-y-4"
      >
        <input type="hidden" name="item_id" value={item.item_id} />
        <input type="hidden" name="task_id" value={item.task_id ?? ""} />
        <input type="hidden" name="verdict" value={verdict} />
        <input type="hidden" name="voice_path" value={voicePath} />
        <input type="hidden" name="transcript" value={transcript} />
        <input ref={msField} type="hidden" name="ms_spent" defaultValue="" />

        <div className="flex gap-2">
          {(
            [
              ["good", "Good question", "bg-green-600"],
              ["unsure", "Not sure", "bg-wolf"],
              ["bad", "Something's wrong", "bg-terra"],
            ] as const
          ).map(([v, label, bg]) => (
            <button
              key={v}
              type="button"
              onClick={() => setVerdict(v)}
              className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-black transition ${
                verdict === v ? `${bg} text-white` : "bg-felt text-wolf hover:bg-felt/70"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="space-y-3 rounded-xl bg-warm p-4">
          {AXES.map((axis) => (
            <AxisRow key={axis.key} axis={axis} />
          ))}
        </div>

        <div>
          <label htmlFor="reason_text" className="mb-1 block text-sm font-black text-steppe">
            Why? {verdict === "bad" && <span className="text-terra">Required</span>}
          </label>
          <textarea
            id="reason_text"
            name="reason_text"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="What would you change, and what should it say instead?"
            className="w-full resize-none rounded-xl border-2 border-felt bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-steppe"
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <VoiceNote prefix={`label/${item.item_id}`} onResult={onVoice} disabled={pending} />
            <label className="flex items-center gap-2 text-xs font-bold text-wolf">
              How sure are you?
              <select
                name="rater_confidence"
                defaultValue="4"
                className="rounded-lg border-2 border-felt bg-white px-2 py-1 font-bold outline-none focus:border-steppe"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {state.error && <p className="text-sm font-bold text-terra">{state.error}</p>}

        <div className="flex flex-wrap items-center gap-2">
          {saved ? (
            <>
              <span className="inline-flex items-center gap-1 text-sm font-black text-green-700">
                <Check size={14} /> Saved
              </span>
              <Button variant="gold" type="button" onClick={advance}>
                Next question <ChevronRight size={14} />
              </Button>
            </>
          ) : (
            <>
              <Button variant="gold" type="submit" disabled={pending}>
                {pending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Save
              </Button>
              <Button variant="ghost" type="button" onClick={advance}>
                Skip <ChevronRight size={14} />
              </Button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
