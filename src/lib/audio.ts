// Synthesized SFX via WebAudio so the games are never silent, even without
// uploaded audio assets. Major-chord arpeggio for correct, low pulse for wrong.
import { VOCAB } from "@/content/vocab";
import { LETTER_AUDIO_SRC } from "@/content/letter-audio";

let ctx: AudioContext | null = null;
let activeClip: HTMLAudioElement | null = null;

// Generated Kazakh TTS clips, keyed by the Cyrillic word as games pass it in.
const VOCAB_AUDIO_SRC: Record<string, string> = Object.fromEntries(
  VOCAB.map((v) => [v.kk, `/audio/vocab/${v.slug}.mp3`]),
);

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AC) ctx = new AC();
  }
  return ctx;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType, gain: number) {
  const a = ac();
  if (!a) return;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.connect(g);
  g.connect(a.destination);
  const t = a.currentTime + start;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export function playCorrect() {
  // C-E-G major chord arpeggio
  tone(523.25, 0, 0.18, "triangle", 0.25);
  tone(659.25, 0.08, 0.18, "triangle", 0.22);
  tone(783.99, 0.16, 0.28, "triangle", 0.2);
}

export function playWrong() {
  tone(160, 0, 0.22, "sine", 0.3);
}

export function playPop() {
  tone(880, 0, 0.08, "square", 0.12);
}

export function playWin() {
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.1, 0.3, "triangle", 0.22));
}

export function letterAudioSrc(cyr: string): string | null {
  return LETTER_AUDIO_SRC[cyr] ?? null;
}

// Play an arbitrary audio clip (e.g. a greeting MP3). Falls back to a synthesized
// cue when the file is missing or playback is blocked, so the game is never silent.
export function playClip(src: string, fallbackText: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    activeClip?.pause();
    activeClip = new Audio(src);
    activeClip.preload = "auto";
    activeClip.currentTime = 0;
    activeClip.volume = 1;
    const promise = activeClip.play();
    if (promise) {
      void promise.catch(() => synthWordCue(fallbackText));
    }
    return true;
  } catch {
    synthWordCue(fallbackText);
    return false;
  }
}

export function playLetterPronunciation(cyr: string, fallbackText = cyr): boolean {
  const src = letterAudioSrc(cyr);
  if (!src || typeof window === "undefined") {
    speakWord(fallbackText);
    return false;
  }

  try {
    activeClip?.pause();
    activeClip = new Audio(src);
    activeClip.preload = "auto";
    activeClip.currentTime = 0;
    activeClip.volume = 1;
    const promise = activeClip.play();
    if (promise) {
      void promise.catch(() => speakWord(fallbackText));
    }
    return true;
  } catch {
    speakWord(fallbackText);
    return false;
  }
}

// Speak a Kazakh word: play its generated TTS clip when one exists (all VOCAB
// entries have one), otherwise fall back to the synthesized two-note cue.
export function speakWord(kk: string) {
  const src = VOCAB_AUDIO_SRC[kk];
  if (src) {
    playClip(src, kk);
  } else {
    synthWordCue(kk);
  }
}

function synthWordCue(kk: string) {
  // Friendly two-note motif varied by word length so the cue feels word-specific.
  const base = 600 + (kk.length % 5) * 30;
  tone(base, 0, 0.12, "sine", 0.2);
  tone(base * 1.33, 0.1, 0.16, "sine", 0.18);
}
