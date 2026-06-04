/* proto-games-b.jsx — playable: Steppe Bazaar, Flashlight Words.
   Loads after proto-shell.jsx. */

/* ============================================================
   STEPPE BAZAAR (Базар) — food vocab + numbers + counting teńge.
   Tap items into the basket; app sums the price; confirm the total.
   ============================================================ */
const BAZAAR_GOODS = [
  { slug: "nan",      kk: "Нан",      en: "bread",     price: 50, c: "#d9a441" },
  { slug: "alma",     kk: "Алма",     en: "apple",     price: 30, c: "#c8102e" },
  { slug: "bauyrsaq", kk: "Бауырсақ", en: "fry-bread", price: 20, c: "#e8b04b" },
  { slug: "sut",      kk: "Сүт",      en: "milk",      price: 40, c: "#eef0e8" },
  { slug: "shai",     kk: "Шай",      en: "tea",       price: 25, c: "#9c5a2c" },
  { slug: "bal",      kk: "Бал",      en: "honey",     price: 35, c: "#e0a82e" },
];
// Tasks reference real vocab; "want" maps slug→qty.
const BAZAAR_TASKS = [
  { text: ["Buy ", "2 alma", " (apples) and ", "1 nan", " (bread)"], want: { alma: 2, nan: 1 } },
  { text: ["Buy ", "3 bauyrsaq", " and ", "1 shai", " (tea)"],       want: { bauyrsaq: 3, shai: 1 } },
  { text: ["Buy ", "1 sut", " (milk) and ", "2 bal", " (honey)"],    want: { sut: 1, bal: 2 } },
];

function FoodIcon({ slug, c, size = 56 }) {
  // tiny schematic per food — felt-style line art on a coloured disc
  const inner = {
    nan: <ellipse cx="50" cy="52" rx="30" ry="20" fill="none" stroke="#7a4f12" strokeWidth="4" />,
    alma: <g><circle cx="50" cy="54" r="22" fill="none" stroke="#fff" strokeWidth="4" /><path d="M50 32 q6 -10 14 -8" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" /></g>,
    bauyrsaq: <rect x="32" y="36" width="36" height="32" rx="9" fill="none" stroke="#7a4f12" strokeWidth="4" />,
    sut: <path d="M40 30 h20 l4 40 h-28 z" fill="none" stroke="#9aa0a6" strokeWidth="4" strokeLinejoin="round" />,
    shai: <g><path d="M34 40 h28 v14 a14 14 0 0 1 -28 0 z" fill="none" stroke="#fff" strokeWidth="4" /><path d="M62 44 q10 2 8 12" fill="none" stroke="#fff" strokeWidth="4" /></g>,
    bal: <path d="M38 34 h24 v8 l-4 28 h-16 l-4 -28 z" fill="none" stroke="#7a4f12" strokeWidth="4" strokeLinejoin="round" />,
  };
  return (
    <div style={{ width: size, height: size, borderRadius: 999, background: c, border: "3px solid rgba(0,0,0,.08)", display: "grid", placeItems: "center" }}>
      <svg viewBox="0 0 100 100" width={size * 0.8} height={size * 0.8} aria-hidden="true">{inner[slug]}</svg>
    </div>
  );
}

function GameBazaar({ onBack, onAward }) {
  const TOTAL = BAZAAR_TASKS.length;
  const [taskIdx, setTaskIdx] = useState(0);
  const [basket, setBasket] = useState({}); // slug -> qty
  const [state, setState] = useState("shop"); // shop | right | wrong | done
  const [score, setScore] = useState(0);
  const [burst, setBurst] = useState(0);
  const [toast, showToast] = useToast();

  const task = BAZAAR_TASKS[taskIdx];
  const total = Object.entries(basket).reduce((s, [slug, q]) => s + q * BAZAAR_GOODS.find((g) => g.slug === slug).price, 0);
  const want = task.want;
  const wantTotal = Object.entries(want).reduce((s, [slug, q]) => s + q * BAZAAR_GOODS.find((g) => g.slug === slug).price, 0);

  function add(slug) { if (state !== "shop") return; setBasket((b) => ({ ...b, [slug]: (b[slug] || 0) + 1 })); }
  function remove(slug, e) { e.stopPropagation(); if (state !== "shop") return; setBasket((b) => { const n = { ...b }; if (n[slug] > 1) n[slug]--; else delete n[slug]; return n; }); }

  function pay() {
    if (state !== "shop") return;
    const exact = Object.keys(want).every((s) => (basket[s] || 0) === want[s]) && Object.keys(basket).every((s) => (want[s] || 0) === basket[s]);
    if (exact) { setState("right"); setScore((s) => s + 1); setBurst((b) => b + 1); showToast(`Дұрыс! ${total} ₸ — perfect basket`, "good"); }
    else { setState("wrong"); showToast("Check the basket against the task", "bad", 2200); }
  }

  function next() {
    if (taskIdx >= TOTAL - 1) { setState("done"); onAward && onAward(score * 25); return; }
    setTaskIdx((i) => i + 1); setBasket({}); setState("shop");
  }

  const basketItems = Object.entries(basket);

  return (
    <div style={{ width: "100%", height: "100%", background: PALETTE.warm, fontFamily: "Nunito, sans-serif", overflow: "hidden", display: "flex", flexDirection: "column", position: "relative" }}>
      <GameBar slug="bazaar" title="Steppe Bazaar" kk="Базар" accent={PALETTE.terra} onBack={onBack}
        right={<><span style={{ background: "rgba(255,255,255,.15)", borderRadius: 999, padding: "6px 14px", fontWeight: 800, fontSize: 14 }}>Task {Math.min(taskIdx + 1, TOTAL)} / {TOTAL}</span><span style={{ background: PALETTE.gold, color: PALETTE.steppe700, borderRadius: 999, padding: "6px 16px", fontWeight: 900, fontSize: 16 }}>{total} ₸</span></>} />

      {state === "done" ? (
        <DoneScreen title="Bazaar cleared!" lines={[`${score} / ${TOTAL} baskets right`, `+${score * 25} points`]}
          onReplay={() => { setTaskIdx(0); setBasket({}); setScore(0); setState("shop"); }} onBack={onBack} accent={PALETTE.terra} />
      ) : (
        <div style={{ flex: 1, padding: 18, display: "flex", flexDirection: "column", gap: 14, minHeight: 0 }}>
          {/* task bar */}
          <div style={{ background: PALETTE.steppe, color: PALETTE.warm, borderRadius: 18, padding: "14px 20px", display: "flex", alignItems: "center", gap: 14, flex: "0 0 auto" }}>
            <span style={{ fontSize: 12, fontWeight: 900, color: PALETTE.gold, letterSpacing: 1, flex: "0 0 auto" }}>ТАПСЫРМА · TASK</span>
            <span style={{ fontSize: 21, fontWeight: 900 }}>{task.text.map((t, i) => i % 2 ? <span key={i} style={{ color: PALETTE.gold }}>{t}</span> : t)}</span>
            <span style={{ marginLeft: "auto", fontSize: 14, fontWeight: 800, opacity: 0.9, flex: "0 0 auto" }}>Tap items, then count your teńge</span>
          </div>

          {/* market stall */}
          <div style={{ position: "relative", flex: 1, borderRadius: 20, background: "#fff", border: `2px solid ${PALETTE.felt}`, padding: "24px 20px 18px", minHeight: 0, display: "flex", flexDirection: "column" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 18, display: "flex", borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: "hidden" }}>
              {Array.from({ length: 20 }).map((_, i) => <div key={i} style={{ flex: 1, background: i % 2 ? PALETTE.terra : PALETTE.warm }} />)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 12 }}>
              {BAZAAR_GOODS.map((g) => {
                const qty = basket[g.slug] || 0;
                return (
                  <button key={g.slug} onClick={() => add(g.slug)} style={{
                    position: "relative", borderRadius: 16, border: qty ? `4px solid ${PALETTE.terra}` : `2px solid ${PALETTE.felt}`,
                    padding: "12px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: state === "shop" ? "pointer" : "default",
                    background: qty ? "rgba(200,16,46,.05)" : "#fff", fontFamily: "Nunito, sans-serif", transition: "all .12s",
                  }}>
                    {qty > 0 && <span onClick={(e) => remove(g.slug, e)} style={{ position: "absolute", top: -10, right: -10, width: 28, height: 28, borderRadius: 999, background: PALETTE.terra, color: "#fff", fontWeight: 900, fontSize: 15, display: "grid", placeItems: "center", boxShadow: "0 2px 6px rgba(0,0,0,.25)" }}>{qty}</span>}
                    <FoodIcon slug={g.slug} c={g.c} />
                    <div style={{ fontSize: 17, fontWeight: 900, color: PALETTE.steppe }}>{g.kk}</div>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: PALETTE.wolf }}>{g.en}</div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: PALETTE.terra }}>{g.price} ₸</div>
                  </button>
                );
              })}
            </div>

            {/* basket + total row */}
            <div style={{ marginTop: "auto", paddingTop: 14, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: PALETTE.wolf }}>Basket:</span>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flex: 1 }}>
                {basketItems.length === 0 ? <span style={{ fontSize: 14, fontWeight: 700, color: PALETTE.feltDeep }}>empty — tap food above</span>
                  : basketItems.map(([slug, q]) => {
                    const g = BAZAAR_GOODS.find((x) => x.slug === slug);
                    return <span key={slug} style={{ background: PALETTE.felt, borderRadius: 999, padding: "5px 12px", fontSize: 13.5, fontWeight: 800, color: PALETTE.steppe }}>{q} × {g.kk} <span style={{ color: PALETTE.wolf }}>({q * g.price}₸)</span></span>;
                  })}
              </div>
              <span style={{ fontSize: 17, fontWeight: 900, color: PALETTE.steppe }}>Total = <span style={{ color: PALETTE.terra }}>{total} ₸</span></span>
              {state === "shop"
                ? <BigButton onClick={pay} disabled={basketItems.length === 0} tone="gold" style={{ padding: "12px 26px", fontSize: 16 }}>Pay & check</BigButton>
                : <BigButton onClick={next} tone="steppe" style={{ padding: "12px 26px", fontSize: 16 }}>{taskIdx >= TOTAL - 1 ? "Results →" : "Next task →"}</BigButton>}
            </div>
            {state === "wrong" && <div style={{ marginTop: 10, background: "rgba(200,16,46,.08)", border: `2px solid ${PALETTE.terra}`, borderRadius: 12, padding: "8px 14px", fontSize: 14, fontWeight: 800, color: PALETTE.terra }}>Not the right basket. The task needs {Object.entries(want).map(([s, q]) => `${q} ${BAZAAR_GOODS.find((g) => g.slug === s).kk}`).join(" + ")} = {wantTotal} ₸.</div>}
          </div>
        </div>
      )}
      <Burst fire={burst} />
      <Toast toast={toast} />
    </div>
  );
}

/* ============================================================
   FLASHLIGHT WORDS (Жарық) — fullscreen; light follows pointer,
   click inside the beam to catch a revealed animal word.
   ============================================================ */
const FLASH_WORDS = [
  { kk: "ҚАСҚЫР", en: "wolf",        x: 50, y: 46 },
  { kk: "ТҮЛКІ",  en: "fox",         x: 80, y: 30 },
  { kk: "АЮ",     en: "bear",        x: 18, y: 30 },
  { kk: "ЖЫЛАН",  en: "snake",       x: 86, y: 74 },
  { kk: "ҚҰС",    en: "bird",        x: 24, y: 72 },
  { kk: "БҮРКІТ", en: "eagle",       x: 50, y: 84 },
  { kk: "БАРЫС",  en: "snow leopard",x: 64, y: 58 },
  { kk: "ТҮЙЕ",   en: "camel",       x: 38, y: 56 },
];
const BEAM_R = 150; // px radius of the lit beam

function GameFlashlight({ onBack, onAward }) {
  const stageRef = useRef(null);
  const [pos, setPos] = useState({ x: 0.5, y: 0.5 }); // fractional
  const [found, setFound] = useState([]);
  const [isFs, setIsFs] = useState(false);
  const [hint, setHint] = useState(null);
  const [toast, showToast] = useToast();
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    const onFs = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  function move(e) {
    const stage = stageRef.current; if (!stage) return;
    const r = stage.getBoundingClientRect();
    const pt = e.touches ? e.touches[0] : e;
    setPos({ x: (pt.clientX - r.left) / r.width, y: (pt.clientY - r.top) / r.height });
  }

  function beamPx() {
    const stage = stageRef.current; if (!stage) return { x: 0, y: 0, w: 1, h: 1 };
    const r = stage.getBoundingClientRect();
    return { x: pos.x * r.width, y: pos.y * r.height, w: r.width, h: r.height };
  }

  // which words are currently lit (within beam radius)?
  function litWord() {
    const b = beamPx();
    for (const w of FLASH_WORDS) {
      if (found.includes(w.kk)) continue;
      const wx = (w.x / 100) * b.w, wy = (w.y / 100) * b.h;
      if (Math.hypot(wx - b.x, wy - b.y) < BEAM_R * 0.62) return w;
    }
    return null;
  }

  function clickCatch() {
    const w = litWord();
    if (w) {
      setFound((f) => [...f, w.kk]); setBurst((b) => b + 1);
      showToast(`Caught ${w.kk} — ${w.en}!`, "good");
      if (found.length + 1 >= FLASH_WORDS.length) { onAward && onAward(FLASH_WORDS.length * 8); setTimeout(() => showToast("All animals found! 🎉", "win", 2600), 700); }
    }
  }

  function toggleFs() {
    const stage = stageRef.current;
    if (!document.fullscreenElement) { stage?.requestFullscreen?.().catch(() => {}); }
    else { document.exitFullscreen?.(); }
  }

  const b = beamPx();
  const active = litWord();
  const remaining = FLASH_WORDS.length - found.length;

  return (
    <div ref={stageRef} onMouseMove={move} onTouchMove={move} onClick={clickCatch}
      style={{ width: "100%", height: "100%", fontFamily: "Nunito, sans-serif", overflow: "hidden", position: "relative", cursor: "none",
        background: "radial-gradient(120% 90% at 50% 0%, #16335c 0%, #0c1f3a 55%, #06101f 100%)" }}>

      {/* dark mask with a hole punched where the light is (CSS radial mask) */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none",
        background: `radial-gradient(circle ${BEAM_R}px at ${b.x}px ${b.y}px, transparent 0%, transparent 40%, rgba(4,10,20,.86) 72%)` }} />

      {/* hidden words (faint always; bright when lit) */}
      {FLASH_WORDS.map((w) => {
        const wx = (w.x / 100) * b.w, wy = (w.y / 100) * b.h;
        const dist = Math.hypot(wx - b.x, wy - b.y);
        const isFound = found.includes(w.kk);
        const lit = !isFound && dist < BEAM_R;
        const near = lit ? Math.max(0.25, 1 - dist / BEAM_R) : 0.05;
        return (
          <div key={w.kk} style={{ position: "absolute", left: w.x + "%", top: w.y + "%", transform: "translate(-50%,-50%)", textAlign: "center", pointerEvents: "none",
            opacity: isFound ? 0.32 : (lit ? 1 : 0.06), transition: "opacity .12s" }}>
            <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: 1,
              color: isFound ? "#1c7a4a" : (lit ? "#3a2a06" : "rgba(255,255,255,.5)"),
              textShadow: lit ? "0 1px 0 rgba(255,236,170,.9)" : "none" }}>{w.kk}</div>
            {lit && <div style={{ fontSize: 16, fontWeight: 800, color: "#6b5212" }}>{w.en}</div>}
            {isFound && <div style={{ fontSize: 22, fontWeight: 900, color: "#1c7a4a" }}>✓</div>}
            {active && active.kk === w.kk && <div style={{ marginTop: 6, display: "inline-block", background: PALETTE.steppe700, color: PALETTE.gold, fontWeight: 900, fontSize: 13, padding: "5px 13px", borderRadius: 999, boxShadow: "0 4px 12px rgba(0,0,0,.4)" }}>Click to catch!</div>}
          </div>
        );
      })}

      {/* the glowing beam core + cursor ring */}
      <div style={{ position: "absolute", left: b.x, top: b.y, width: BEAM_R * 2, height: BEAM_R * 2, transform: "translate(-50%,-50%)", borderRadius: "50%", pointerEvents: "none",
        background: "radial-gradient(circle, rgba(255,236,170,.42) 0%, rgba(255,221,120,.16) 45%, transparent 68%)", mixBlendMode: "screen" }} />
      <div style={{ position: "absolute", left: b.x, top: b.y, width: 22, height: 22, transform: "translate(-50%,-50%)", border: "2px solid rgba(255,255,255,.7)", borderRadius: "50%", pointerEvents: "none", zIndex: 5 }} />

      {/* HUD */}
      <button onClick={(e) => { e.stopPropagation(); onBack(); }} style={{ position: "absolute", top: 16, left: 16, zIndex: 8, border: "2px solid rgba(255,255,255,.35)", background: "rgba(255,255,255,.1)", color: PALETTE.warm, width: 42, height: 42, borderRadius: 12, display: "grid", placeItems: "center", cursor: "pointer" }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
      </button>
      <div style={{ position: "absolute", top: 16, left: 70, color: PALETTE.warm, zIndex: 8, pointerEvents: "none" }}>
        <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.5, color: PALETTE.gold }}>ЖАРЫҚ · FLASHLIGHT WORDS</div>
        <div style={{ fontSize: 22, fontWeight: 900 }}>Find the animals · <span style={{ color: PALETTE.gold }}>{found.length} / {FLASH_WORDS.length}</span></div>
      </div>
      <button onClick={(e) => { e.stopPropagation(); toggleFs(); }} style={{ position: "absolute", top: 16, right: 16, zIndex: 8, border: "2px solid rgba(255,255,255,.4)", background: "rgba(255,255,255,.1)", color: PALETTE.warm, fontWeight: 900, fontSize: 15, padding: "10px 18px", borderRadius: 999, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
        <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 6V2h4M16 6V2h-4M2 12v4h4M16 12v4h-4" /></svg>
        {isFs ? "Exit fullscreen" : "Go Fullscreen"}
      </button>

      {/* footer: tip + found row */}
      <div style={{ position: "absolute", bottom: 16, left: 18, right: 18, display: "flex", alignItems: "center", gap: 10, zIndex: 8, pointerEvents: "none" }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: "rgba(255,255,255,.72)" }}>Move the light with mouse or finger · click inside the beam to catch a word. {remaining > 0 ? `${remaining} to go.` : "Done!"}</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end", maxWidth: "55%" }}>
          {found.map((w) => <span key={w} style={{ background: "rgba(255,215,0,.16)", color: PALETTE.gold, fontWeight: 800, fontSize: 13, padding: "5px 11px", borderRadius: 999, border: "1px solid rgba(255,215,0,.35)" }}>✓ {w}</span>)}
        </div>
      </div>

      <Burst fire={burst} />
      <Toast toast={toast} />
    </div>
  );
}

Object.assign(window, { GameBazaar, GameFlashlight, BAZAAR_GOODS, FLASH_WORDS });
