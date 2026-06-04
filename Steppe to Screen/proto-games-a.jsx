/* proto-games-a.jsx — playable: Sound It Out, Where in Kazakhstan?
   Loads after proto-shell.jsx. */

/* ============================================================
   SOUND IT OUT (Дыбыс) — hear a sound → tap the matching letter.
   Focus: the 9 letters Kazakh has that Russian doesn't.
   ============================================================ */
// The 9 special letters with a Latin sound hint + a real Kazakh example word.
const SPECIAL_LETTERS = [
  { cyr: "Ә", latin: "ä", ex: "Әке", exEn: "father" },
  { cyr: "Ғ", latin: "ğ", ex: "Аға", exEn: "brother" },
  { cyr: "Қ", latin: "q", ex: "Қой", exEn: "sheep" },
  { cyr: "Ң", latin: "ñ", ex: "Таң", exEn: "dawn" },
  { cyr: "Ө", latin: "ö", ex: "Өзен", exEn: "river" },
  { cyr: "Ұ", latin: "ū", ex: "Ұл", exEn: "son" },
  { cyr: "Ү", latin: "ü", ex: "Үй", exEn: "house" },
  { cyr: "Һ", latin: "h", ex: "Гауһар", exEn: "jewel" },
  { cyr: "І", latin: "i", ex: "Іні", exEn: "lil bro" },
];

function pickRound(prevCyr) {
  const pool = SPECIAL_LETTERS.filter((l) => l.cyr !== prevCyr);
  const answer = pool[Math.floor(Math.random() * pool.length)];
  const distractors = SPECIAL_LETTERS.filter((l) => l.cyr !== answer.cyr)
    .sort(() => Math.random() - 0.5).slice(0, 2);
  const options = [answer, ...distractors].sort(() => Math.random() - 0.5);
  return { answer, options };
}

function GameSoundItOut({ onBack, onAward }) {
  const TOTAL = 6;
  const [round, setRound] = useState(() => pickRound(null));
  const [idx, setIdx] = useState(1);
  const [hearts, setHearts] = useState(3);
  const [picked, setPicked] = useState(null);
  const [state, setState] = useState("guess"); // guess | right | wrong | done
  const [score, setScore] = useState(0);
  const [toast, showToast] = useToast();
  const [burst, setBurst] = useState(0);
  const [pulse, setPulse] = useState(false);

  const playSound = useCallback((auto) => {
    setPulse(true);
    speak(round.answer.ex, "ru-RU"); // example word carries the letter's sound
    setTimeout(() => setPulse(false), 800);
  }, [round]);

  useEffect(() => { const t = setTimeout(() => playSound(true), 350); return () => clearTimeout(t); }, [round, playSound]);

  function check() {
    if (picked == null || state !== "guess") return;
    const correct = picked === round.answer.cyr;
    if (correct) {
      setState("right"); setScore((s) => s + 1); setBurst((b) => b + 1);
      showToast("Дұрыс! Correct", "good");
    } else {
      setState("wrong"); setHearts((h) => Math.max(0, h - 1));
      showToast(`That was ${SPECIAL_LETTERS.find((l) => l.cyr === picked)?.cyr} — listen again`, "bad", 2000);
    }
  }

  function next() {
    if (idx >= TOTAL || hearts <= 0) {
      setState("done");
      onAward && onAward(score * 12);
      return;
    }
    setIdx((i) => i + 1);
    setRound(pickRound(round.answer.cyr));
    setPicked(null); setState("guess");
  }

  if (hearts <= 0 && state !== "done") { setState("done"); }

  return (
    <div style={{ width: "100%", height: "100%", background: PALETTE.warm, fontFamily: "Nunito, sans-serif", overflow: "hidden", display: "flex", flexDirection: "column", position: "relative" }}>
      <GameBar slug="sound-it-out" title="Sound It Out" kk="Дыбыс" accent={PALETTE.steppe} onBack={onBack}
        right={<><ProgressBar value={idx - (state === "done" ? 0 : 1)} max={TOTAL} width={170} /><Hearts n={hearts} /></>} />

      {state === "done" ? (
        <DoneScreen title="Round complete!" lines={[`${score} / ${TOTAL} correct`, `+${score * 12} points`]}
          onReplay={() => { setIdx(1); setHearts(3); setScore(0); setRound(pickRound(null)); setPicked(null); setState("guess"); }}
          onBack={onBack} accent={PALETTE.steppe} />
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "10px 40px", gap: 16 }}>
          <div style={{ fontSize: 23, fontWeight: 900, color: PALETTE.steppe }}>Listen — which letter makes this sound?</div>

          <button onClick={() => playSound(false)} style={{
            border: "none", cursor: "pointer", width: 124, height: 124, borderRadius: 999, background: PALETTE.steppe, color: PALETTE.gold,
            display: "grid", placeItems: "center", boxShadow: "0 10px 0 rgba(23,60,110,.35)", position: "relative",
          }}>
            {pulse && <span style={{ position: "absolute", inset: -10, borderRadius: 999, border: `4px solid ${PALETTE.gold}`, animation: "protoRing 0.8s ease-out" }} />}
            <svg width="54" height="54" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 42 H32 L48 28 V72 L32 58 H20 Z" fill="currentColor" /><path d="M58 38 Q68 50 58 62" /><path d="M68 28 Q86 50 68 72" />
            </svg>
          </button>
          <div style={{ fontSize: 14, fontWeight: 800, color: PALETTE.wolf }}>🔊 Tap to hear it again · sound: <b style={{ color: PALETTE.terra }}>"{round.answer.latin}"</b> as in <b style={{ color: PALETTE.steppe }}>{round.answer.ex}</b> ({round.answer.exEn})</div>

          <div style={{ display: "flex", gap: 18, marginTop: 4 }}>
            {round.options.map((o) => {
              const isPicked = picked === o.cyr;
              const isAnswer = o.cyr === round.answer.cyr;
              let border = `3px solid ${PALETTE.feltDeep}`, bg = "#fff";
              if (state === "guess" && isPicked) { border = `4px solid ${PALETTE.steppe}`; bg = "rgba(30,77,140,.08)"; }
              if (state === "right" && isAnswer) { border = `4px solid #1c7a4a`; bg = "rgba(28,122,74,.1)"; }
              if (state === "wrong" && isPicked) { border = `4px solid ${PALETTE.terra}`; bg = "rgba(200,16,46,.08)"; }
              if (state === "wrong" && isAnswer) { border = `4px solid #1c7a4a`; bg = "rgba(28,122,74,.1)"; }
              return (
                <button key={o.cyr} disabled={state !== "guess"} onClick={() => setPicked(o.cyr)} style={{
                  border, cursor: state === "guess" ? "pointer" : "default", width: 132, height: 132, borderRadius: 26, background: bg,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
                  boxShadow: "0 6px 14px rgba(23,60,110,.1)", transition: "all .15s",
                  transform: state === "wrong" && isPicked ? "translateX(0)" : "none",
                  animation: state === "wrong" && isPicked ? "protoShake .4s" : "none",
                }}>
                  <span style={{ fontSize: 62, fontWeight: 900, color: PALETTE.steppe, lineHeight: 1 }}>{o.cyr}</span>
                  {state !== "guess" && <span style={{ fontSize: 14, fontWeight: 800, color: PALETTE.wolf }}>{o.latin}</span>}
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: 6, height: 56, display: "flex", alignItems: "center" }}>
            {state === "guess"
              ? <BigButton onClick={check} disabled={picked == null}>Check</BigButton>
              : <BigButton onClick={next} tone={state === "right" ? "steppe" : "gold"}>{idx >= TOTAL ? "See results →" : "Next →"}</BigButton>}
          </div>

          <div style={{ background: PALETTE.felt, borderRadius: 14, padding: "8px 18px", fontSize: 13.5, fontWeight: 800, color: PALETTE.steppe700 }}>
            Focus: the 9 letters Kazakh has that Russian doesn't — <span style={{ color: PALETTE.terra }}>Ә Ғ Қ Ң Ө Ұ Ү Һ І</span>
          </div>
        </div>
      )}
      <Burst fire={burst} />
      <Toast toast={toast} />
    </div>
  );
}

/* ============================================================
   WHERE IN KAZAKHSTAN? (Қайда?) — photo → drop a pin on the map.
   Uses the real region centroids (1000×600) from regions.ts.
   ============================================================ */
const WKZ_REGIONS = [
  { id: "almaty",    name: "Almaty",    kk: "Алматы",    x: 760, y: 430, sky: ["#bfe0f2", "#eaf6e0"], hue: "#3f7d4f", fact: "Almaty sits at the foot of the snowy Alatau mountains. Its name comes from alma — apple!" },
  { id: "astana",    name: "Astana",    kk: "Астана",    x: 540, y: 250, sky: ["#cfe2f5", "#eef2f7"], hue: "#7f93a8", fact: "Astana is the capital — one of the coldest capital cities on Earth." },
  { id: "aral",      name: "Aral",      kk: "Арал",      x: 250, y: 320, sky: ["#dfe9c9", "#f2eed0"], hue: "#9fae6a", fact: "The Aral Sea was once one of the largest lakes in the world." },
  { id: "charyn",    name: "Charyn",    kk: "Шарын",     x: 820, y: 400, sky: ["#f6c46a", "#f2e3bd"], hue: "#c8102e", fact: "Charyn Canyon glows red, orange and gold at sunset." },
  { id: "mangystau", name: "Mangystau", kk: "Маңғыстау", x: 120, y: 420, sky: ["#e7eef2", "#f5f0e4"], hue: "#cdb98e", fact: "Chalk-white cliffs and underground mosques by the Caspian Sea." },
  { id: "karaganda", name: "Karaganda", kk: "Қарағанды", x: 500, y: 360, sky: ["#e3ddc4", "#f2ead0"], hue: "#b08a3e", fact: "Heart of the steppe — shepherds share bauyrsaq with every guest." },
  { id: "shymkent",  name: "Shymkent",  kk: "Шымкент",   x: 420, y: 480, sky: ["#f3d9a8", "#f5eccf"], hue: "#d98a2b", fact: "A warm southern city famous for its friendly bazaars." },
  { id: "turkistan", name: "Türkistan", kk: "Түркістан", x: 360, y: 450, sky: ["#dfe6f2", "#f0ead8"], hue: "#3a7ca5", fact: "Home to the great Mausoleum of Khoja Ahmed Yasawi." },
];
// A stylized Kazakhstan outline on the same 1000×600 canvas as the centroids.
const KZ_OUTLINE = "M60 300 Q120 200 250 215 Q360 150 470 185 Q600 130 720 175 Q880 150 940 250 Q975 330 880 380 Q800 470 640 440 Q500 510 360 460 Q210 500 120 420 Q40 360 60 300 Z";

// A simple schematic "photo" of a place — coloured horizon + silhouettes.
function PlacePhoto({ region }) {
  return (
    <svg viewBox="0 0 600 440" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs><linearGradient id={`sky-${region.id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={region.sky[0]} /><stop offset="1" stopColor={region.sky[1]} /></linearGradient></defs>
      <rect width="600" height="440" fill={`url(#sky-${region.id})`} />
      <circle cx="475" cy="95" r="42" fill="#ffffff" opacity="0.55" />
      <path d="M0 300 L90 200 L150 260 L240 170 L320 250 L400 180 L500 270 L600 210 V440 H0 Z" fill={region.hue} opacity="0.85" />
      <path d="M0 360 L120 285 L210 335 L320 265 L430 335 L540 285 L600 325 V440 H0 Z" fill={region.hue} opacity="0.62" />
      <path d="M0 405 L160 355 L320 395 L480 350 L600 385 V440 H0 Z" fill={region.hue} opacity="0.9" />
    </svg>
  );
}

function GameWhereKZ({ onBack, onAward }) {
  const TOTAL = 5;
  const [order] = useState(() => [...WKZ_REGIONS].sort(() => Math.random() - 0.5));
  const [idx, setIdx] = useState(0);
  const [pin, setPin] = useState(null);     // {x,y} in 1000×600 space
  const [state, setState] = useState("guess"); // guess | revealed | done
  const [score, setScore] = useState(0);
  const [lastClose, setLastClose] = useState(0);
  const [burst, setBurst] = useState(0);
  const [toast, showToast] = useToast();
  const svgRef = useRef(null);

  const target = order[idx];

  function mapClick(e) {
    if (state !== "guess") return;
    const svg = svgRef.current; const r = svg.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 1000;
    const y = ((e.clientY - r.top) / r.height) * 600;
    setPin({ x, y });
  }

  function guess() {
    if (!pin || state !== "guess") return;
    const d = Math.hypot(pin.x - target.x, pin.y - target.y);
    // 1000-wide map: <90px ≈ spot on, <180 close.
    const close = Math.max(0, Math.round(100 - (d / 5)));
    setLastClose(close);
    if (d < 90) { setScore((s) => s + 1); setBurst((b) => b + 1); showToast("Bullseye! +1", "good"); }
    else if (d < 180) { showToast("So close!", "bad"); }
    else { showToast("Not quite — see where it was", "bad"); }
    setState("revealed");
  }

  function next() {
    if (idx >= TOTAL - 1) { setState("done"); onAward && onAward(score * 20); return; }
    setIdx((i) => i + 1); setPin(null); setState("guess");
  }

  return (
    <div style={{ width: "100%", height: "100%", background: PALETTE.warm, fontFamily: "Nunito, sans-serif", overflow: "hidden", display: "flex", flexDirection: "column", position: "relative" }}>
      <GameBar slug="where-kz" title="Where in Kazakhstan?" kk="Қайда?" accent={PALETTE.terra} onBack={onBack}
        right={<><span style={{ background: "rgba(255,255,255,.15)", borderRadius: 999, padding: "6px 14px", fontWeight: 800, fontSize: 14 }}>Round {Math.min(idx + 1, TOTAL)} / {TOTAL}</span><span style={{ background: PALETTE.gold, color: PALETTE.steppe700, borderRadius: 999, padding: "6px 14px", fontWeight: 900, fontSize: 14 }}>★ {score}</span></>} />

      {state === "done" ? (
        <DoneScreen title="Journey done!" lines={[`${score} / ${TOTAL} found`, `+${score * 20} points`]}
          onReplay={() => { setIdx(0); setPin(null); setScore(0); setState("guess"); }} onBack={onBack} accent={PALETTE.terra} />
      ) : (
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, padding: 20, minHeight: 0 }}>
          {/* photo side */}
          <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: PALETTE.steppe, marginBottom: 8 }}>Where is this place?</div>
            <div style={{ position: "relative", borderRadius: 20, overflow: "hidden", flex: 1, boxShadow: "0 12px 26px rgba(23,60,110,.2)" }}>
              <PlacePhoto region={target} />
              <div style={{ position: "absolute", top: 10, left: 10, background: "rgba(27,27,27,.62)", color: PALETTE.warm, fontSize: 10.5, fontWeight: 800, letterSpacing: 1, padding: "4px 9px", borderRadius: 7 }}>PHOTO PLACEHOLDER · real location photos go here</div>
              {state === "revealed" && (
                <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, background: "linear-gradient(transparent, rgba(15,39,72,.92))", color: PALETTE.warm, padding: "26px 16px 14px" }}>
                  <div style={{ fontSize: 24, fontWeight: 900 }}>{target.name} · <span style={{ color: PALETTE.gold }}>{target.kk}</span></div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, opacity: 0.92, lineHeight: 1.35, marginTop: 2 }}>{target.fact}</div>
                </div>
              )}
            </div>
          </div>
          {/* map side */}
          <div style={{ borderRadius: 20, background: "#fff", border: `2px solid ${PALETTE.felt}`, padding: 14, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: PALETTE.wolf, marginBottom: 6 }}>{state === "guess" ? "Tap the map to drop your pin →" : "↓ where it really was"}</div>
            <svg ref={svgRef} viewBox="0 0 1000 600" width="100%" style={{ flex: 1, cursor: state === "guess" ? "crosshair" : "default", borderRadius: 12, background: "#eef4fa" }} onClick={mapClick} aria-label="Map of Kazakhstan">
              <path d={KZ_OUTLINE} fill={PALETTE.felt} stroke={PALETTE.steppe} strokeWidth="5" strokeLinejoin="round" />
              {/* faint other-stop dots for orientation */}
              {WKZ_REGIONS.map((r) => <circle key={r.id} cx={r.x} cy={r.y} r="6" fill="rgba(30,77,140,.18)" />)}
              {/* dropped pin */}
              {pin && <g transform={`translate(${pin.x},${pin.y})`}>
                <circle r="26" fill="rgba(200,16,46,.16)" />
                <path d="M0 8 C-14 -10 -10 -28 0 -28 C10 -28 14 -10 0 8 Z" fill={PALETTE.terra} stroke="#fff" strokeWidth="3" />
                <circle cx="0" cy="-19" r="5" fill="#fff" />
              </g>}
              {/* answer + connecting line on reveal */}
              {state === "revealed" && <g>
                <line x1={pin?.x} y1={pin?.y} x2={target.x} y2={target.y} stroke={PALETTE.steppe} strokeWidth="3" strokeDasharray="6 7" />
                <circle cx={target.x} cy={target.y} r="11" fill="#1c7a4a" stroke="#fff" strokeWidth="3" />
                <text x={target.x} y={target.y - 18} textAnchor="middle" fontFamily="Nunito" fontWeight="900" fontSize="22" fill="#1c7a4a">{target.name}</text>
              </g>}
            </svg>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: PALETTE.wolf }}>
                {state === "guess" ? (pin ? "Pin dropped — ready" : "No pin yet") : <>Closeness: <b style={{ color: lastClose > 70 ? "#1c7a4a" : PALETTE.terra }}>{lastClose}%</b></>}
              </span>
              {state === "guess"
                ? <BigButton onClick={guess} disabled={!pin} tone="gold" style={{ padding: "12px 26px", fontSize: 16 }}>Guess →</BigButton>
                : <BigButton onClick={next} tone="steppe" style={{ padding: "12px 26px", fontSize: 16 }}>{idx >= TOTAL - 1 ? "Results →" : "Next place →"}</BigButton>}
            </div>
          </div>
        </div>
      )}
      <Burst fire={burst} />
      <Toast toast={toast} />
    </div>
  );
}

/* Shared "round complete" panel. */
function DoneScreen({ title, lines, onReplay, onBack, accent }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, position: "relative" }}>
      <Burst fire={1} />
      <div style={{ width: 96, height: 96, borderRadius: 999, background: accent, display: "grid", placeItems: "center", boxShadow: "0 10px 26px rgba(0,0,0,.18)" }}>
        <Star16 color={PALETTE.gold} />
        <svg width="50" height="50" viewBox="0 0 24 24" fill={PALETTE.gold} style={{ position: "absolute" }}><path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17.8 5.9 21.4l1.5-6.8L2.2 9l6.9-.7z" /></svg>
      </div>
      <div style={{ fontSize: 30, fontWeight: 900, color: PALETTE.steppe }}>{title}</div>
      {lines.map((l, i) => <div key={i} style={{ fontSize: i === 0 ? 20 : 17, fontWeight: 800, color: i === 0 ? PALETTE.steppe700 : PALETTE.goldDeep }}>{l}</div>)}
      <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
        <BigButton onClick={onReplay} tone="gold">↺ Replay for more</BigButton>
        <BigButton onClick={onBack} tone="ghost">Back to map</BigButton>
      </div>
    </div>
  );
}

Object.assign(window, { GameSoundItOut, GameWhereKZ, DoneScreen, SPECIAL_LETTERS, WKZ_REGIONS });
