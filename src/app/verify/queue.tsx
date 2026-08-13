"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Check, Flag, Play, SkipForward, Volume2 } from "lucide-react";
import { KIND_CHECKS, KIND_LABELS, type VerifyItem } from "@/lib/verify-items";
import { submitVerification } from "./actions";

export function VerifyQueue({
  deck,
  total,
  reviewedByTeam,
}: {
  deck: VerifyItem[];
  total: number;
  reviewedByTeam: number;
}) {
  const [done, setDone] = useState<Set<string>>(new Set());
  const [mine, setMine] = useState(0);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [flagging, setFlagging] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const commentRef = useRef<HTMLTextAreaElement>(null);

  const remaining = useMemo(() => {
    const live = deck.filter((item) => !done.has(item.id));
    const behind = new Set(skipped);
    return [...live.filter((i) => !behind.has(i.id)), ...live.filter((i) => behind.has(i.id))];
  }, [deck, done, skipped]);

  const item = remaining[0];
  const covered = Math.min(total, reviewedByTeam + done.size);

  function send(verdict: "approved" | "needs_work") {
    if (!item || pending) return;
    const note = comment;
    startTransition(async () => {
      const result = await submitVerification(item.id, verdict, note);
      if ("error" in result) {
        setNotice(result.error);
        return;
      }
      setNotice(
        "taken" in result ? "Someone on the team just reviewed that one — skipping ahead." : null,
      );
      if ("ok" in result) setMine((n) => n + 1);
      setDone((prev) => new Set(prev).add(item.id));
      setComment("");
      setFlagging(false);
    });
  }

  function skip() {
    if (!item) return;
    setSkipped((prev) => [...prev, item.id]);
    setComment("");
    setFlagging(false);
    setNotice(null);
  }

  // A 161-item sweep is a keyboard job. Only bound while the reviewer is not
  // typing a reason, so 'a' stays a letter inside the textarea.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA)$/.test(target.tagName)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "a") {
        event.preventDefault();
        send("approved");
      } else if (event.key === "f") {
        event.preventDefault();
        setFlagging(true);
        setTimeout(() => commentRef.current?.focus(), 0);
      } else if (event.key === "s") {
        event.preventDefault();
        skip();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!item) {
    return (
      <div className="rounded-lg border border-[#e2e5ea] bg-white p-8 text-center">
        <p className="text-[15px] font-semibold">
          {covered >= total ? "Every question has been checked." : "Nothing left in your queue."}
        </p>
        <p className="mt-1 text-[13px] text-[#64748b]">
          {covered >= total
            ? `All ${total} items have one review. Flagged ones are listed below.`
            : `The team has covered ${covered} of ${total}. The rest are already reviewed or waiting on someone else's tab.`}
        </p>
        {mine > 0 && (
          <p className="mt-3 text-[13px] font-medium">You reviewed {mine} this session. Rahmet.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 text-[12px] text-[#64748b]">
        <span>
          <b className="font-semibold tabular-nums text-[#0f172a]">{covered}</b> of {total} checked
          by the team
          {mine > 0 && <> · {mine} by you just now</>}
        </span>
        <span className="tabular-nums">{remaining.length} left in your queue</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[#eef1f5]">
        <div
          className="h-full rounded-full bg-[#0f172a] transition-[width] duration-500"
          style={{ width: `${total ? (covered / total) * 100 : 0}%` }}
        />
      </div>

      <div className="rounded-lg border border-[#e2e5ea] bg-white">
        <header className="flex flex-wrap items-center gap-2 border-b border-[#eef1f5] px-4 py-2.5 text-[12px]">
          <span className="rounded bg-[#eef1f5] px-1.5 py-0.5 font-medium uppercase tracking-wider text-[#64748b]">
            {KIND_LABELS[item.kind]}
          </span>
          <span className="text-[#64748b]">{item.group}</span>
          {item.aiDrafted && (
            <span className="rounded bg-[#fdf0d5] px-1.5 py-0.5 font-medium text-[#8a6100]">
              never checked by a native speaker
            </span>
          )}
          <code className="ml-auto text-[11px] text-[#94a3b8]">{item.id}</code>
        </header>

        <div className="grid gap-5 p-4 md:grid-cols-[1.2fr_1fr]">
          <div>
            {item.prompt && (
              <p className="mb-3 text-[14px] font-medium leading-relaxed">{item.prompt}</p>
            )}

            {item.lines ? (
              <div className="space-y-1">
                {item.lines.map((line, i) => (
                  <p key={i} className="text-[20px] font-semibold leading-snug">
                    {line}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-[30px] font-semibold leading-tight tracking-tight">{item.kk}</p>
            )}

            <dl className="mt-3 space-y-1 text-[13px]">
              {item.latin && <Row label="Latin" value={item.latin} />}
              {item.en && <Row label="English" value={item.en} />}
              {item.ru && <Row label="Russian" value={item.ru} />}
              {item.answer && <Row label="Correct answer" value={item.answer} />}
              {item.options && (
                <Row
                  label={item.kind === "couplet" ? "Decoy tiles" : "Options"}
                  value={item.options.join(" · ")}
                />
              )}
            </dl>

            {item.audio ? (
              <Clip src={item.audio} key={item.id} />
            ) : (
              <p className="mt-4 flex items-center gap-1.5 text-[12px] text-[#94a3b8]">
                <Volume2 size={13} /> No clip on this one — read it instead.
              </p>
            )}
          </div>

          <div className="rounded-md bg-[#f7f8fa] p-3">
            <h3 className="text-[12px] font-semibold uppercase tracking-wider text-[#64748b]">
              What to check
            </h3>
            <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-[#334155]">
              {KIND_CHECKS[item.kind].map((check) => (
                <li key={check} className="flex gap-1.5">
                  <span className="text-[#94a3b8]">·</span>
                  {check}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {notice && (
          <p className="border-t border-[#eef1f5] bg-[#fdf0d5] px-4 py-2 text-[12px] text-[#8a6100]">
            {notice}
          </p>
        )}

        {flagging && (
          <div className="border-t border-[#eef1f5] px-4 py-3">
            <label htmlFor="verify-comment" className="text-[12px] font-medium text-[#475569]">
              What is wrong with it?
            </label>
            <textarea
              id="verify-comment"
              ref={commentRef}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={2}
              placeholder="Clip says the Russian х, not Kazakh қ."
              className="mt-1.5 w-full resize-none rounded-md border border-[#dbe0e6] px-2.5 py-2 text-[13px] outline-none focus:border-[#94a3b8]"
            />
          </div>
        )}

        <footer className="flex flex-wrap items-center gap-2 border-t border-[#eef1f5] px-4 py-3">
          <button
            type="button"
            onClick={() => send("approved")}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#0f172a] px-3 py-1.5 text-[13px] font-medium text-white transition hover:bg-[#1e293b] disabled:opacity-50"
          >
            <Check size={14} /> Sounds right
          </button>
          {flagging ? (
            <button
              type="button"
              onClick={() => send("needs_work")}
              disabled={pending || comment.trim().length < 3}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#c8102e] px-3 py-1.5 text-[13px] font-medium text-[#c8102e] transition hover:bg-[#fdeaed] disabled:opacity-50"
            >
              <Flag size={14} /> Send for review
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setFlagging(true);
                setTimeout(() => commentRef.current?.focus(), 0);
              }}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#dbe0e6] px-3 py-1.5 text-[13px] font-medium text-[#475569] transition hover:bg-[#f1f3f6] disabled:opacity-50"
            >
              <Flag size={14} /> Needs work
            </button>
          )}
          <button
            type="button"
            onClick={skip}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] text-[#64748b] transition hover:bg-[#f1f3f6] disabled:opacity-50"
          >
            <SkipForward size={14} /> Not sure, later
          </button>
          <span className="ml-auto hidden text-[11px] text-[#94a3b8] sm:inline">
            a approve · f needs work · s skip
          </span>
        </footer>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-[104px] shrink-0 text-[#94a3b8]">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function Clip({ src }: { src: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [missing, setMissing] = useState(false);
  const [playing, setPlaying] = useState(false);

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => {
          const audio = ref.current;
          if (!audio) return;
          audio.currentTime = 0;
          void audio.play();
        }}
        disabled={missing}
        className="inline-flex items-center gap-2 rounded-md border border-[#dbe0e6] bg-white px-3 py-1.5 text-[13px] font-medium transition hover:bg-[#f1f3f6] disabled:opacity-50"
      >
        <Play size={14} /> {playing ? "Playing…" : missing ? "Clip missing" : "Listen"}
      </button>
      <audio
        ref={ref}
        src={src}
        preload="auto"
        onPlay={() => setPlaying(true)}
        onEnded={() => setPlaying(false)}
        onError={() => setMissing(true)}
      />
      <p className="mt-1.5 text-[11px] text-[#94a3b8]">
        {missing ? `Nothing at ${src} — that alone is worth flagging.` : src}
      </p>
    </div>
  );
}
