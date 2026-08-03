"use client";

import { useRef, useState } from "react";
import { Loader2, Mic, Square } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase/client";

// Record a thought, keep the audio, get a transcript.
//
// Order matters: the recording is uploaded to the private voice-notes bucket
// FIRST, then transcribed. If transcription fails — no API key, a 502, an
// unlucky network — the thought is still saved and can be retried later. The
// component reports both back so the caller can persist path and text together.

export type VoiceNoteResult = { path: string | null; transcript: string };

export function VoiceNote({
  prefix,
  onResult,
  disabled,
}: {
  /** Storage path prefix, e.g. `label/${itemId}`. */
  prefix: string;
  onResult: (result: VoiceNoteResult) => void;
  disabled?: boolean;
}) {
  const [state, setState] = useState<"idle" | "recording" | "working">("idle");
  const [error, setError] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  async function start() {
    setError(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      setError("This browser can't record audio.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunks.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        void finish(new Blob(chunks.current, { type: mr.mimeType || "audio/webm" }));
      };
      recorder.current = mr;
      mr.start();
      setState("recording");
    } catch {
      setError("Microphone permission denied.");
    }
  }

  function stop() {
    recorder.current?.stop();
    recorder.current = null;
    setState("working");
  }

  async function finish(blob: Blob) {
    let path: string | null = null;

    // 1. Keep the audio no matter what happens next.
    const sb = getSupabaseBrowser();
    if (sb) {
      const candidate = `${prefix}/${crypto.randomUUID()}.webm`;
      const { error: upErr } = await sb.storage
        .from("voice-notes")
        .upload(candidate, blob, { contentType: blob.type || "audio/webm" });
      if (!upErr) path = candidate;
    }

    // 2. Then try to turn it into text.
    let transcript = "";
    try {
      const form = new FormData();
      form.append("audio", blob, "note.webm");
      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      const json = (await res.json()) as { transcript?: string; error?: string };
      if (res.ok) {
        transcript = json.transcript ?? "";
      } else {
        setError(json.error ?? "Transcription failed, the recording was still saved.");
      }
    } catch {
      setError("Transcription failed, the recording was still saved.");
    }

    setState("idle");
    onResult({ path, transcript });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {state === "recording" ? (
        <button
          type="button"
          onClick={stop}
          className="inline-flex items-center gap-1.5 rounded-full bg-terra px-3 py-1.5 text-xs font-black text-white transition hover:brightness-95"
        >
          <Square size={12} /> Stop
          <span className="ml-1 h-2 w-2 animate-pulse rounded-full bg-white" />
        </button>
      ) : (
        <button
          type="button"
          onClick={start}
          disabled={disabled || state === "working"}
          className="inline-flex items-center gap-1.5 rounded-full bg-felt px-3 py-1.5 text-xs font-black text-wolf transition hover:bg-gold/20 hover:text-steppe-700 disabled:opacity-50"
        >
          {state === "working" ? (
            <>
              <Loader2 size={12} className="animate-spin" /> Transcribing…
            </>
          ) : (
            <>
              <Mic size={12} /> Say it instead
            </>
          )}
        </button>
      )}
      {error && <span className="text-xs font-bold text-terra">{error}</span>}
    </div>
  );
}
