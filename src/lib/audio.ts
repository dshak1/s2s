// Synthesized SFX via WebAudio so the games are never silent, even without
// uploaded audio assets. Major-chord arpeggio for correct, low pulse for wrong.
let ctx: AudioContext | null = null;

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

// Placeholder "speak the Kazakh word" — until real audio assets are uploaded
// via /admin/content we play a short friendly chime so the cue still lands.
export function speakWord(_kk: string) {
  tone(660, 0, 0.12, "sine", 0.2);
  tone(880, 0.1, 0.16, "sine", 0.18);
}
