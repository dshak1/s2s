/* s2s-games.jsx — fresh game concept mockups (desktop screens). */

/* ---- shared bits ---- */
function GameTopBar({ slug, title, kk, accent, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 24px", background: PALETTE.steppe, color: PALETTE.warm }}>
      <span style={{ width: 42, height: 42, borderRadius: 12, background: accent, display: "grid", placeItems: "center", flex: "0 0 auto" }}>
        <GameGlyph slug={slug} size={30} style={{ color: glyphInk(accent) }} />
      </span>
      <div>
        <div style={{ fontSize: 19, fontWeight: 900, lineHeight: 1 }}>{title}</div>
        <div style={{ fontSize: 12, fontWeight: 800, color: PALETTE.gold }}>{kk}</div>
      </div>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>{right}</div>
    </div>
  );
}
function Hearts({ n = 3, max = 3 }) {
  return (
    <span style={{ display: "inline-flex", gap: 3 }}>
      {Array.from({ length: max }).map((_, i) => (
        <svg key={i} width="20" height="20" viewBox="0 0 24 24" fill={i < n ? PALETTE.terra : "rgba(255,255,255,.25)"} aria-hidden="true"><path d="M12 21s-7-4.7-9.5-9C1 9 2.5 5.5 6 5.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3 3.5 0 5 3.5 3.5 6.5C19 16.3 12 21 12 21z" /></svg>
      ))}
    </span>
  );
}
function PlayPill({ children, big }) {
  return <span style={{ background: PALETTE.gold, color: PALETTE.steppe700, fontWeight: 900, fontSize: big ? 18 : 15, padding: big ? "14px 30px" : "10px 22px", borderRadius: 999, boxShadow: "0 6px 0 rgba(0,0,0,.16)" }}>{children}</span>;
}

/* ============================================================
   WHERE IN KAZAKHSTAN?  (Қайда?) — photo → place on the map
   ============================================================ */
function GameWhereKZ() {
  const kzPath = "M28 165 Q70 105 150 120 Q210 78 290 110 Q370 66 450 98 Q545 86 575 150 Q588 210 525 232 Q478 286 388 262 Q305 305 222 272 Q118 292 66 240 Q14 212 28 165 Z";
  const pins = [
    { id: "aktau", x: 70, y: 215, name: "Aktau" },
    { id: "aral", x: 150, y: 172, name: "Aral" },
    { id: "astana", x: 300, y: 128, name: "Astana" },
    { id: "burabay", x: 330, y: 112, name: "Burabay" },
    { id: "karaganda", x: 320, y: 182, name: "Karaganda" },
    { id: "almaty", x: 470, y: 222, name: "Almaty" },
    { id: "charyn", x: 512, y: 214, name: "Charyn", sel: true },
  ];
  return (
    <div style={{ width: "100%", height: "100%", background: PALETTE.warm, fontFamily: "Nunito, sans-serif", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <GameTopBar slug="where-kz" title="Where in Kazakhstan?" kk="Қайда?" accent={PALETTE.terra}
        right={<><span style={{ background: "rgba(255,255,255,.15)", borderRadius: 999, padding: "6px 14px", fontWeight: 800, fontSize: 14 }}>Round 3 / 5</span><Hearts n={3} /></>} />
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, padding: 24 }}>
        {/* photo */}
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, color: PALETTE.steppe, marginBottom: 10 }}>Where is this place? <span style={{ color: PALETTE.wolf, fontSize: 16, fontWeight: 700 }}>Drop your pin on the map →</span></div>
          <div style={{ position: "relative", borderRadius: 22, overflow: "hidden", height: 470, boxShadow: "0 12px 26px rgba(23,60,110,.2)" }}>
            {/* placeholder Charyn-canyon-style landscape */}
            <svg viewBox="0 0 600 440" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
              <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f6c46a" /><stop offset="1" stopColor="#f2e3bd" /></linearGradient></defs>
              <rect width="600" height="440" fill="url(#sky)" />
              <circle cx="470" cy="110" r="46" fill="#ffe39a" />
              <path d="M0 300 L90 200 L150 260 L240 170 L320 250 L400 180 L500 270 L600 210 V440 H0 Z" fill="#c8102e" opacity="0.85" />
              <path d="M0 360 L120 280 L210 330 L320 260 L430 330 L540 280 L600 320 V440 H0 Z" fill="#9c2a1e" />
              <path d="M0 400 L160 350 L320 390 L480 345 L600 380 V440 H0 Z" fill="#6e2417" />
            </svg>
            <div style={{ position: "absolute", top: 12, left: 12, background: "rgba(27,27,27,.7)", color: PALETTE.warm, fontSize: 11, fontWeight: 800, letterSpacing: 1, padding: "5px 10px", borderRadius: 8 }}>PHOTO PLACEHOLDER · drop in real workshop / location photos</div>
          </div>
        </div>
        {/* map */}
        <div style={{ borderRadius: 22, background: "#fff", border: `2px solid ${PALETTE.felt}`, padding: 16, display: "flex", flexDirection: "column" }}>
          <svg viewBox="0 0 600 320" width="100%" style={{ flex: 1 }} aria-label="Map of Kazakhstan">
            <path d={kzPath} fill={PALETTE.felt} stroke={PALETTE.steppe} strokeWidth="4" strokeLinejoin="round" />
            {pins.map((p) => (
              <g key={p.id} transform={`translate(${p.x},${p.y})`}>
                {p.sel && <circle r="20" fill="rgba(200,16,46,.18)" />}
                <circle r={p.sel ? 9 : 6} fill={p.sel ? PALETTE.terra : PALETTE.steppe} stroke="#fff" strokeWidth="2.5" />
                {p.sel && <text x="0" y="-18" textAnchor="middle" fontFamily="Nunito" fontWeight="900" fontSize="16" fill={PALETTE.terra}>Charyn?</text>}
              </g>
            ))}
          </svg>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: PALETTE.wolf }}>Pin dropped: <b style={{ color: PALETTE.terra }}>Charyn · Шарын</b></span>
            <PlayPill>Guess →</PlayPill>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   SOUND IT OUT  (Дыбыс) — hear → pick the Kazakh letter sound
   ============================================================ */
function GameSoundItOut() {
  const opts = [{ letter: "Ә", on: true }, { letter: "А" }, { letter: "Е" }];
  return (
    <div style={{ width: "100%", height: "100%", background: PALETTE.warm, fontFamily: "Nunito, sans-serif", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <GameTopBar slug="sound-it-out" title="Sound It Out" kk="Дыбыс" accent={PALETTE.steppe}
        right={<><div style={{ width: 180, height: 10, borderRadius: 999, background: "rgba(255,255,255,.2)" }}><div style={{ width: "40%", height: "100%", borderRadius: 999, background: PALETTE.gold }} /></div><Hearts n={2} /></>} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "16px 40px", gap: 18 }}>
        <div style={{ fontSize: 24, fontWeight: 900, color: PALETTE.steppe }}>Listen — which letter makes this sound?</div>
        {/* big play-the-prompt button */}
        <button style={{ border: "none", cursor: "pointer", width: 130, height: 130, borderRadius: 999, background: PALETTE.steppe, color: PALETTE.gold, display: "grid", placeItems: "center", boxShadow: "0 10px 0 rgba(23,60,110,.35)" }}>
          <svg width="56" height="56" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 42 H32 L48 28 V72 L32 58 H20 Z" fill="currentColor" /><path d="M58 38 Q68 50 58 62" /><path d="M68 28 Q86 50 68 72" /></svg>
        </button>
        <div style={{ fontSize: 14, fontWeight: 800, color: PALETTE.wolf }}>Tap to hear it again</div>
        {/* three letter options */}
        <div style={{ display: "flex", gap: 18, marginTop: 6 }}>
          {opts.map((o) => (
            <button key={o.letter} style={{ border: o.on ? `4px solid ${PALETTE.steppe}` : `3px solid ${PALETTE.feltDeep}`, cursor: "pointer", width: 130, height: 130, borderRadius: 26, background: o.on ? "rgba(30,77,140,.08)" : "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: "0 6px 14px rgba(23,60,110,.1)" }}>
              <span style={{ fontSize: 62, fontWeight: 900, color: PALETTE.steppe, lineHeight: 1 }}>{o.letter}</span>
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 8 }}>
          <PlayPill big>Check</PlayPill>
        </div>
        <div style={{ marginTop: 4, background: PALETTE.felt, borderRadius: 14, padding: "10px 18px", fontSize: 14, fontWeight: 800, color: PALETTE.steppe700 }}>
          Focus: the 9 letters Kazakh has that Russian doesn't — <span style={{ color: PALETTE.terra }}>Ә Ғ Қ Ң Ө Ұ Ү Һ І</span>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   FLASHLIGHT WORDS  (Жарық) — fullscreen, light reveals words
   ============================================================ */
function GameFlashlight() {
  const hidden = [{ x: 24, y: 70, w: "ҚҰС" }, { x: 80, y: 30, w: "ТҮЛКІ" }, { x: 18, y: 30, w: "АЮ" }, { x: 86, y: 76, w: "ЖЫЛАН" }];
  return (
    <div style={{ width: "100%", height: "100%", fontFamily: "Nunito, sans-serif", overflow: "hidden", position: "relative", background: "radial-gradient(120% 90% at 50% 0%, #16335c 0%, #0c1f3a 55%, #06101f 100%)" }}>
      {/* HUD */}
      <div style={{ position: "absolute", top: 16, left: 20, color: PALETTE.warm, zIndex: 3 }}>
        <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.5, color: PALETTE.gold }}>ЖАРЫҚ · FLASHLIGHT WORDS</div>
        <div style={{ fontSize: 22, fontWeight: 900 }}>Find the animals · <span style={{ color: PALETTE.gold }}>3 / 8</span></div>
      </div>
      <button style={{ position: "absolute", top: 16, right: 20, zIndex: 3, border: `2px solid rgba(255,255,255,.4)`, background: "rgba(255,255,255,.1)", color: PALETTE.warm, fontWeight: 900, fontSize: 15, padding: "10px 18px", borderRadius: 999, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
        <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 6V2h4M16 6V2h-4M2 12v4h4M16 12v4h-4" /></svg>
        Go Fullscreen
      </button>
      {/* faint hidden words */}
      {hidden.map((h, i) => (
        <div key={i} style={{ position: "absolute", left: h.x + "%", top: h.y + "%", transform: "translate(-50%,-50%)", color: "rgba(255,255,255,.06)", fontWeight: 900, fontSize: 30, letterSpacing: 1 }}>{h.w}</div>
      ))}
      {/* the lit beam */}
      <div style={{ position: "absolute", left: "57%", top: "47%", width: 360, height: 360, transform: "translate(-50%,-50%)", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,236,170,.95) 0%, rgba(255,221,120,.55) 38%, rgba(255,215,0,.12) 62%, transparent 72%)", display: "grid", placeItems: "center", boxShadow: "0 0 80px 30px rgba(255,221,120,.15)" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 52, fontWeight: 900, color: "#3a2a06", lineHeight: 1 }}>ҚАСҚЫР</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#6b5212" }}>wolf</div>
          <div style={{ marginTop: 10, display: "inline-block", background: PALETTE.steppe700, color: PALETTE.gold, fontWeight: 900, fontSize: 13, padding: "6px 14px", borderRadius: 999 }}>Tap to catch it!</div>
        </div>
      </div>
      {/* cursor ring hint */}
      <div style={{ position: "absolute", left: "57%", top: "47%", width: 26, height: 26, transform: "translate(-50%,-50%)", border: "2px solid rgba(255,255,255,.5)", borderRadius: "50%", zIndex: 2 }} />
      {/* footer tip + found row */}
      <div style={{ position: "absolute", bottom: 16, left: 20, right: 20, display: "flex", alignItems: "center", gap: 10, zIndex: 3 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: "rgba(255,255,255,.7)" }}>Move the light with mouse, finger, or a real torch on the projector wall.</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {["ат", "ит", "қой"].map((w) => (
            <span key={w} style={{ background: "rgba(255,215,0,.16)", color: PALETTE.gold, fontWeight: 800, fontSize: 13, padding: "6px 12px", borderRadius: 999, border: "1px solid rgba(255,215,0,.35)" }}>✓ {w}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   STEPPE BAZAAR  (Базар) — food words + numbers + counting teńge
   ============================================================ */
function GameBazaar() {
  const goods = [
    { kk: "Нан", en: "bread", price: 50, c: "#d9a441" },
    { kk: "Алма", en: "apple", price: 30, c: "#c8102e", sel: 2 },
    { kk: "Бауырсақ", en: "fry-bread", price: 20, c: "#e8b04b" },
    { kk: "Сүт", en: "milk", price: 40, c: "#eef0e8" },
    { kk: "Шай", en: "tea", price: 25, c: "#9c5a2c" },
  ];
  return (
    <div style={{ width: "100%", height: "100%", background: PALETTE.warm, fontFamily: "Nunito, sans-serif", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <GameTopBar slug="bazaar" title="Steppe Bazaar" kk="Базар" accent={PALETTE.terra}
        right={<span style={{ background: PALETTE.gold, color: PALETTE.steppe700, borderRadius: 999, padding: "7px 16px", fontWeight: 900, fontSize: 16 }}>200 ₸</span>} />
      <div style={{ flex: 1, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
        {/* task */}
        <div style={{ background: PALETTE.steppe, color: PALETTE.warm, borderRadius: 20, padding: "16px 22px", display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 900, color: PALETTE.gold, letterSpacing: 1 }}>ТАПСЫРМА · TASK</span>
          <span style={{ fontSize: 22, fontWeight: 900 }}>Buy <span style={{ color: PALETTE.gold }}>2 alma</span> (apples) and <span style={{ color: PALETTE.gold }}>1 nan</span> (bread)</span>
          <span style={{ marginLeft: "auto", fontSize: 15, fontWeight: 800, opacity: 0.9 }}>How many teńge? Count it out.</span>
        </div>
        {/* market stall */}
        <div style={{ position: "relative", flex: 1, borderRadius: 22, background: "#fff", border: `2px solid ${PALETTE.felt}`, padding: "26px 22px 22px" }}>
          {/* awning */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 22, display: "flex", borderTopLeftRadius: 22, borderTopRightRadius: 22, overflow: "hidden" }}>
            {Array.from({ length: 16 }).map((_, i) => (<div key={i} style={{ flex: 1, background: i % 2 ? PALETTE.terra : PALETTE.warm }} />))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 16, marginTop: 6 }}>
            {goods.map((g) => (
              <div key={g.kk} style={{ position: "relative", borderRadius: 18, border: g.sel ? `4px solid ${PALETTE.terra}` : `2px solid ${PALETTE.felt}`, padding: 14, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, background: g.sel ? "rgba(200,16,46,.05)" : "#fff" }}>
                {g.sel && <span style={{ position: "absolute", top: -10, right: -10, width: 28, height: 28, borderRadius: 999, background: PALETTE.terra, color: "#fff", fontWeight: 900, fontSize: 14, display: "grid", placeItems: "center" }}>{g.sel}</span>}
                <div style={{ width: 64, height: 64, borderRadius: 999, background: g.c, border: "3px solid rgba(0,0,0,.08)" }} />
                <div style={{ fontSize: 18, fontWeight: 900, color: PALETTE.steppe }}>{g.kk}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: PALETTE.wolf }}>{g.en}</div>
                <div style={{ fontSize: 14, fontWeight: 900, color: PALETTE.terra }}>{g.price} ₸</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 18 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: PALETTE.wolf }}>Basket: 2 × Алма + 1 × Нан</span>
            <span style={{ marginLeft: "auto", fontSize: 16, fontWeight: 900, color: PALETTE.steppe }}>Total = 30 + 30 + 50 = <span style={{ color: PALETTE.terra }}>110 ₸</span></span>
            <PlayPill>Pay & check</PlayPill>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { GameWhereKZ, GameSoundItOut, GameFlashlight, GameBazaar });
