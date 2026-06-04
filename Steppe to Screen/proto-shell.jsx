/* proto-shell.jsx — Steppe to Screen interactive prototype: shared shell.
   Live profile store (localStorage), nav, game chrome, toast + sparkle feedback.
   Loads after s2s-shared.jsx (PALETTE, glyphs, REVISED_GAMES). */

const { useState, useEffect, useRef, useCallback } = React;

/* ----------------------------------------------------------------------------
   PROFILE STORE — a tiny localStorage-backed store that mirrors the real
   src/lib/store.ts shape (xp, streakWeeks, unlockedWeeks, letterStats…).
   The prototype writes to s2s_proto_v1 so it never clobbers the real app key.
---------------------------------------------------------------------------- */
const PROTO_KEY = "s2s_proto_v1";

function freshProto() {
  return {
    displayName: "Aiym",
    xp: 1240,
    streakWeeks: 6,
    unlockedWeeks: 3,        // Silk Road: stops 1..3 cleared, week 3 is "now"
    lettersMastered: 6,      // of 9 special letters → yurt reward
    lastPlayed: null,
  };
}

function loadProto() {
  try {
    const raw = localStorage.getItem(PROTO_KEY);
    return raw ? { ...freshProto(), ...JSON.parse(raw) } : freshProto();
  } catch {
    return freshProto();
  }
}

// React hook around the store. Returns [profile, patch, reset].
function useProto() {
  const [p, setP] = useState(loadProto);
  useEffect(() => {
    try { localStorage.setItem(PROTO_KEY, JSON.stringify(p)); } catch {}
  }, [p]);
  const patch = useCallback((delta) => {
    setP((prev) => ({ ...prev, ...(typeof delta === "function" ? delta(prev) : delta) }));
  }, []);
  const reset = useCallback(() => setP(freshProto()), []);
  return [p, patch, reset];
}

/* ----------------------------------------------------------------------------
   SILK ROAD JOURNEY — the 8 stops (regions) + the in-person weekly codes.
   In the real app a facilitator sets/rotates these; here they're fixed so the
   prototype is fully playable. Codes are case-insensitive.
---------------------------------------------------------------------------- */
const JOURNEY = [
  { id: "almaty",    name: "Almaty",    kk: "Алматы",    code: "ALMA",   fact: "Wild apples first grew here — 'Almaty' comes from alma, apple." },
  { id: "astana",    name: "Astana",    kk: "Астана",    code: "QALA",   fact: "The capital — one of the coldest capital cities on Earth." },
  { id: "aral",      name: "Aral",      kk: "Арал",      code: "TENIZ",  fact: "The Aral Sea is slowly being brought back to life." },
  { id: "charyn",    name: "Charyn",    kk: "Шарын",     code: "TUS",    fact: "Charyn Canyon glows red, orange and gold at sunset." },
  { id: "mangystau", name: "Mangystau", kk: "Маңғыстау", code: "AKTAU",  fact: "Chalk-white cliffs and underground mosques by the Caspian Sea." },
  { id: "karaganda", name: "Karaganda", kk: "Қарағанды", code: "DALA",   fact: "Heart of the steppe — shepherds share bauyrsaq with every guest." },
  { id: "shymkent",  name: "Shymkent",  kk: "Шымкент",   code: "BAZAR",  fact: "A warm southern city famous for its friendly bazaars." },
  { id: "turkistan", name: "Türkistan", kk: "Түркістан", code: "MUNARA", fact: "Home to the great Mausoleum of Khoja Ahmed Yasawi." },
];

/* ----------------------------------------------------------------------------
   FEEDBACK — a floating toast + a lightweight sparkle burst for correct answers.
---------------------------------------------------------------------------- */
function Toast({ toast }) {
  if (!toast) return null;
  const tone = toast.tone || "good";
  const bg = tone === "good" ? PALETTE.steppe : tone === "win" ? "#1c7a4a" : PALETTE.terra;
  return (
    <div style={{
      position: "absolute", left: "50%", bottom: 26, transform: "translateX(-50%)",
      background: bg, color: PALETTE.warm, padding: "12px 22px", borderRadius: 999,
      fontWeight: 900, fontSize: 16, boxShadow: "0 10px 26px rgba(0,0,0,.28)",
      display: "flex", alignItems: "center", gap: 10, zIndex: 50,
      animation: "protoPop .35s cubic-bezier(.2,1.4,.5,1)",
    }}>
      {tone !== "bad" && <Star16 color={PALETTE.gold} />}
      {toast.msg}
    </div>
  );
}

function useToast() {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  const show = useCallback((msg, tone = "good", ms = 1700) => {
    setToast({ msg, tone });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), ms);
  }, []);
  return [toast, show];
}

// Confetti-lite: a burst of gold/terra/steppe dots that fall + fade. Pure CSS.
function Burst({ fire }) {
  if (!fire) return null;
  const colors = [PALETTE.gold, PALETTE.terra, PALETTE.steppe, "#1c7a4a", PALETTE.goldDeep];
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 40 }}>
      {Array.from({ length: 36 }).map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.2;
        const dur = 0.9 + Math.random() * 0.7;
        const size = 7 + Math.random() * 9;
        return (
          <span key={`${fire}-${i}`} style={{
            position: "absolute", left: left + "%", top: "-6%",
            width: size, height: size * (Math.random() > .5 ? 1 : 0.5),
            background: colors[i % colors.length], borderRadius: Math.random() > .5 ? "50%" : 3,
            animation: `protoFall ${dur}s ${delay}s ease-in forwards`,
          }} />
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------------------------------
   GAME CHROME — top bar with back button, title, hearts + progress.
---------------------------------------------------------------------------- */
function Hearts({ n = 3, max = 3 }) {
  return (
    <span style={{ display: "inline-flex", gap: 3 }}>
      {Array.from({ length: max }).map((_, i) => (
        <svg key={i} width="22" height="22" viewBox="0 0 24 24"
          fill={i < n ? PALETTE.terra : "rgba(255,255,255,.22)"} aria-hidden="true"
          style={{ transition: "fill .25s" }}>
          <path d="M12 21s-7-4.7-9.5-9C1 9 2.5 5.5 6 5.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3 3.5 0 5 3.5 3.5 6.5C19 16.3 12 21 12 21z" />
        </svg>
      ))}
    </span>
  );
}

function ProgressBar({ value, max, width = 200 }) {
  return (
    <div style={{ width, height: 12, borderRadius: 999, background: "rgba(255,255,255,.2)", overflow: "hidden" }}>
      <div style={{ width: `${Math.min(100, (value / max) * 100)}%`, height: "100%", borderRadius: 999, background: PALETTE.gold, transition: "width .4s cubic-bezier(.2,1,.4,1)" }} />
    </div>
  );
}

function GameBar({ slug, title, kk, accent, onBack, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 22px", background: PALETTE.steppe, color: PALETTE.warm, flex: "0 0 auto" }}>
      <button onClick={onBack} aria-label="Back to hub" style={{
        border: "none", cursor: "pointer", background: "rgba(255,255,255,.14)", color: PALETTE.warm,
        width: 42, height: 42, borderRadius: 12, display: "grid", placeItems: "center", flex: "0 0 auto",
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
      </button>
      <span style={{ width: 42, height: 42, borderRadius: 12, background: accent, display: "grid", placeItems: "center", flex: "0 0 auto" }}>
        <GameGlyph slug={slug} size={30} style={{ color: glyphInk(accent) }} />
      </span>
      <div>
        <div style={{ fontSize: 19, fontWeight: 900, lineHeight: 1 }}>{title}</div>
        <div style={{ fontSize: 12, fontWeight: 800, color: PALETTE.gold }}>{kk}</div>
      </div>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>{right}</div>
    </div>
  );
}

/* A big tactile button used across games. */
function BigButton({ children, onClick, disabled, tone = "gold", style }) {
  const tones = {
    gold: { bg: PALETTE.gold, fg: PALETTE.steppe700, shadow: "rgba(0,0,0,.18)" },
    steppe: { bg: PALETTE.steppe, fg: PALETTE.warm, shadow: "rgba(23,60,110,.4)" },
    ghost: { bg: "#fff", fg: PALETTE.steppe, shadow: "rgba(23,60,110,.12)" },
  };
  const t = tones[tone] || tones.gold;
  return (
    <button onClick={onClick} disabled={disabled} style={{
      border: tone === "ghost" ? `2px solid ${PALETTE.felt}` : "none",
      cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.45 : 1,
      background: t.bg, color: t.fg, fontWeight: 900, fontSize: 18, fontFamily: "Nunito, sans-serif",
      padding: "14px 32px", borderRadius: 999, boxShadow: disabled ? "none" : `0 6px 0 ${t.shadow}`,
      transition: "transform .08s, box-shadow .08s, opacity .2s", ...style,
    }}
    onMouseDown={(e) => { if (!disabled) { e.currentTarget.style.transform = "translateY(4px)"; e.currentTarget.style.boxShadow = `0 2px 0 ${t.shadow}`; } }}
    onMouseUp={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = disabled ? "none" : `0 6px 0 ${t.shadow}`; }}
    onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = disabled ? "none" : `0 6px 0 ${t.shadow}`; }}>
      {children}
    </button>
  );
}

/* Speak a Kazakh letter/word with the browser's TTS if a voice exists.
   Graceful no-op when unavailable — the game still works visually. */
function speak(text, lang = "ru-RU") {
  try {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang; u.rate = 0.8; u.pitch = 1.05;
    window.speechSynthesis.speak(u);
  } catch {}
}

Object.assign(window, {
  useProto, freshProto, PROTO_KEY, JOURNEY,
  Toast, useToast, Burst, Hearts, ProgressBar, GameBar, BigButton, speak,
});
