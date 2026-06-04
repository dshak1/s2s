/* proto-hub.jsx — Steppe to Screen interactive prototype: Hub A (Silk Road)
   + the router shell that ties the hub to the four playable games.
   Loads last, after s2s-shared.jsx, proto-shell.jsx, proto-games-a/b.jsx. */

/* ----------------------------------------------------------------------------
   LIVE NAV — reads the prototype profile so XP updates as you play.
---------------------------------------------------------------------------- */
function ProtoNav({ profile }) {
  return (
    <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: PALETTE.steppe, color: PALETTE.warm, padding: "14px 28px", boxShadow: "0 4px 14px rgba(0,0,0,.18)", flex: "0 0 auto" }}>
      <div style={{ fontWeight: 900, fontSize: 26, letterSpacing: -0.5 }}>
        Steppe<span style={{ color: PALETTE.gold }}>2</span>Screen
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,.15)", borderRadius: 999, padding: "7px 14px", fontWeight: 800, fontSize: 16 }}>
          <Star16 color={PALETTE.gold} /> {profile.xp.toLocaleString()}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,.15)", borderRadius: 999, padding: "7px 14px", fontWeight: 800, fontSize: 16 }}>
          <Flame16 color={PALETTE.gold} /> {profile.streakWeeks}
        </span>
        <span style={{ width: 44, height: 44, borderRadius: 999, background: PALETTE.gold, color: PALETTE.steppe700, display: "grid", placeItems: "center", fontWeight: 900, fontSize: 18, boxShadow: "inset 0 0 0 3px rgba(255,255,255,.4)" }}>
          {profile.displayName[0]}
        </span>
      </div>
    </header>
  );
}

/* ----------------------------------------------------------------------------
   SILK ROAD TRAIL — the 8-stop journey as a real winding path. Cleared stops
   glow gold, the current week pulses, locked future stops are greyed.
---------------------------------------------------------------------------- */
function SilkRoadTrail({ unlocked, justUnlocked }) {
  // hand-placed nodes along a winding road on a 980×220 band
  const nodes = [
    { x: 60, y: 150 }, { x: 180, y: 88 }, { x: 300, y: 150 }, { x: 430, y: 96 },
    { x: 560, y: 150 }, { x: 690, y: 92 }, { x: 810, y: 150 }, { x: 920, y: 96 },
  ];
  const path = nodes.map((n, i) => `${i === 0 ? "M" : "L"}${n.x} ${n.y}`).join(" ");
  return (
    <svg viewBox="0 0 980 220" width="100%" style={{ display: "block" }} aria-label="Silk Road journey">
      <path d={path} fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="6" strokeLinecap="round" strokeDasharray="2 14" />
      <path d={path} fill="none" stroke={PALETTE.gold} strokeWidth="5" strokeLinecap="round" strokeDasharray="2 14"
        style={{ strokeDashoffset: 0 }}
        pathLength="100" strokeDashoffsetinitial="0"
        // gold trail only up to the unlocked count
        ref={(el) => { if (el) { el.style.strokeDasharray = `${(unlocked - 1) * (100 / 7)} 999`; el.style.strokeWidth = "6"; el.setAttribute("pathLength", "100"); } }} />
      {nodes.map((n, i) => {
        const stop = JOURNEY[i];
        const done = i < unlocked - 1;
        const current = i === unlocked - 1;
        const locked = i >= unlocked;
        const fresh = justUnlocked === i;
        const fill = done ? PALETTE.gold : current ? PALETTE.gold : "rgba(255,255,255,.12)";
        return (
          <g key={stop.id} transform={`translate(${n.x},${n.y})`}>
            {current && <circle r="26" fill="none" stroke={PALETTE.gold} strokeWidth="3" opacity="0.6"><animate attributeName="r" values="20;30;20" dur="2s" repeatCount="indefinite" /><animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" /></circle>}
            {fresh && <circle r="30" fill={PALETTE.gold} opacity="0.3"><animate attributeName="r" values="14;46" dur="0.7s" /><animate attributeName="opacity" values="0.6;0" dur="0.7s" /></circle>}
            <circle r={current ? 18 : 14} fill={fill} stroke={locked ? "rgba(255,255,255,.3)" : PALETTE.warm} strokeWidth={current ? 4 : 3} />
            {locked
              ? <path d="M-4 -1 h8 v6 h-8 z M-2.5 -1 v-3 a2.5 2.5 0 0 1 5 0 v3" fill="none" stroke="rgba(255,255,255,.6)" strokeWidth="1.6" transform="scale(1.1)" />
              : <text x="0" y="5" textAnchor="middle" fontFamily="Nunito" fontWeight="900" fontSize="15" fill={PALETTE.steppe700}>{done ? "✓" : i + 1}</text>}
            <text x="0" y={n.y > 120 ? 38 : -26} textAnchor="middle" fontFamily="Nunito" fontWeight={current ? 900 : 700} fontSize="14"
              fill={locked ? "rgba(255,255,255,.45)" : current ? PALETTE.gold : "rgba(255,255,255,.9)"}>{stop.name}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* In-person code unlock — validates against the next stop's code. */
function CodeUnlockField({ unlocked, onUnlock }) {
  const [val, setVal] = useState("");
  const [shake, setShake] = useState(false);
  const [msg, setMsg] = useState(null);
  const nextStop = JOURNEY[unlocked]; // the stop to unlock next
  const done = unlocked >= JOURNEY.length;

  function submit(e) {
    e.preventDefault();
    if (done) return;
    if (val.trim().toUpperCase() === nextStop.code) {
      setMsg({ ok: true, text: `${nextStop.name} unlocked!` });
      setVal("");
      onUnlock();
    } else {
      setShake(true); setTimeout(() => setShake(false), 450);
      setMsg({ ok: false, text: "Ask your facilitator for today's code." });
    }
  }

  if (done) return <div style={{ fontSize: 14, fontWeight: 800, color: PALETTE.gold }}>🏁 Whole Silk Road complete — replay any stop for more points!</div>;

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,.14)", borderRadius: 999, padding: "6px 6px 6px 16px", animation: shake ? "protoShake .45s" : "none" }}>
        <input value={val} onChange={(e) => setVal(e.target.value)} placeholder="Enter today's code"
          style={{ border: "none", background: "transparent", outline: "none", color: PALETTE.warm, fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 15, letterSpacing: 1.5, width: 150 }} />
        <button type="submit" style={{ border: "none", cursor: "pointer", background: PALETTE.gold, color: PALETTE.steppe700, fontWeight: 900, fontSize: 15, padding: "8px 18px", borderRadius: 999, fontFamily: "Nunito, sans-serif" }}>Unlock</button>
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 700, minHeight: 16, color: msg ? (msg.ok ? PALETTE.gold : "#ffb3b3") : "rgba(255,255,255,.7)" }}>
        {msg ? msg.text : <>Workshop code for <b style={{ color: PALETTE.gold }}>{nextStop.name}</b> · try demo: <b style={{ color: PALETTE.gold }}>{nextStop.code}</b></>}
      </div>
    </form>
  );
}

/* ----------------------------------------------------------------------------
   THE HUB (Option A — Hero / Silk Road journey)
---------------------------------------------------------------------------- */
function Hub({ profile, patch, onOpen }) {
  const [justUnlocked, setJustUnlocked] = useState(null);
  const [toast, showToast] = useToast();
  const playableSet = { "sound-it-out": 1, "where-kz": 1, "bazaar": 1, "jaryq-hunter": 1 };
  const currentStop = JOURNEY[Math.min(profile.unlockedWeeks - 1, JOURNEY.length - 1)];

  function unlockNext() {
    const idx = profile.unlockedWeeks; // becomes done index
    patch((p) => ({ unlockedWeeks: Math.min(JOURNEY.length, p.unlockedWeeks + 1), xp: p.xp + 50 }));
    setJustUnlocked(idx);
    showToast(`+50 · new stop on the Silk Road!`, "win", 2200);
    setTimeout(() => setJustUnlocked(null), 900);
  }

  return (
    <div style={{ width: "100%", minHeight: "100%", background: PALETTE.warm, fontFamily: "Nunito, sans-serif", display: "flex", flexDirection: "column", position: "relative" }}>
      <ProtoNav profile={profile} />
      <main style={{ flex: 1, padding: "24px 40px 36px", maxWidth: 1180, margin: "0 auto", width: "100%" }}>
        {/* Silk Road hero band */}
        <div style={{ borderRadius: 28, padding: "22px 26px 14px", color: PALETTE.warm, position: "relative", overflow: "hidden", boxShadow: "0 14px 30px rgba(23,60,110,.25)", marginBottom: 18, ...feltBg(PALETTE.steppe) }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: 2, color: PALETTE.gold }}>SILK ROAD · АТА ЖОЛЫ · WEEK {Math.min(profile.unlockedWeeks, 8)} OF 8</div>
              <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: -0.8, marginTop: 2 }}>This week: the {currentStop.name} stop</div>
              <p style={{ fontSize: 14.5, fontWeight: 600, opacity: 0.9, maxWidth: 520, margin: "6px 0 0", lineHeight: 1.4 }}>{currentStop.fact}</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-end" }}>
              <CodeUnlockField unlocked={profile.unlockedWeeks} onUnlock={unlockNext} />
            </div>
          </div>
          {/* the trail */}
          <div style={{ marginTop: 6 }}>
            <SilkRoadTrail unlocked={profile.unlockedWeeks} justUnlocked={justUnlocked} />
          </div>
        </div>

        {/* reward + points cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.1fr", gap: 14, marginBottom: 22 }}>
          <div style={{ borderRadius: 20, background: PALETTE.felt, padding: 16, display: "flex", alignItems: "center", gap: 14, boxShadow: "0 8px 18px rgba(23,60,110,.1)" }}>
            <div style={{ width: 58, height: 58, borderRadius: 14, background: PALETTE.gold, display: "grid", placeItems: "center", flex: "0 0 auto" }}><GameGlyph slug="yurt-builder" size={42} style={{ color: PALETTE.steppe700 }} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11.5, fontWeight: 900, color: PALETTE.goldDeep }}>YOUR YURT · REWARD</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: PALETTE.steppe }}>{profile.lettersMastered} of 9 letters mastered</div>
              <div style={{ marginTop: 6, height: 8, borderRadius: 999, background: "rgba(0,0,0,.08)" }}><div style={{ width: `${(profile.lettersMastered / 9) * 100}%`, height: "100%", borderRadius: 999, background: PALETTE.gold, transition: "width .5s" }} /></div>
            </div>
          </div>
          <div style={{ borderRadius: 20, padding: 16, display: "flex", alignItems: "center", gap: 14, color: PALETTE.warm, boxShadow: "0 8px 18px rgba(23,60,110,.1)", ...feltBg(PALETTE.steppe700) }}>
            <div style={{ width: 58, height: 58, borderRadius: 999, background: "rgba(255,255,255,.14)", display: "grid", placeItems: "center", flex: "0 0 auto" }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill={PALETTE.gold}><path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17.8 5.9 21.4l1.5-6.8L2.2 9l6.9-.7z" /></svg>
            </div>
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 900, color: PALETTE.gold }}>POINTS</div>
              <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1 }}>{profile.xp.toLocaleString()}</div>
              <div style={{ fontSize: 12.5, fontWeight: 700, opacity: 0.85 }}>Replay any game for more ↺</div>
            </div>
          </div>
          <div style={{ borderRadius: 20, background: "#fff", border: `2px solid ${PALETTE.felt}`, padding: 16, display: "flex", alignItems: "center", gap: 14, boxShadow: "0 8px 18px rgba(23,60,110,.08)" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11.5, fontWeight: 900, color: PALETTE.terra, letterSpacing: 1 }}>READY TO PLAY</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: PALETTE.steppe, lineHeight: 1.15 }}>Clear this week's games, then replay for more points.</div>
            </div>
            <BigButton onClick={() => onOpen("sound-it-out")} tone="steppe" style={{ padding: "12px 20px", fontSize: 15, flex: "0 0 auto" }}>▶ Play</BigButton>
          </div>
        </div>

        {/* games grid */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 23, fontWeight: 900, color: PALETTE.steppe }}>This week's games</h2>
          <span style={{ fontSize: 13.5, fontWeight: 800, color: PALETTE.wolf }}>English → Kazakh · tap to play · <span style={{ color: PALETTE.terra }}>4 playable in this demo</span></span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14 }}>
          {REVISED_GAMES.map((g) => {
            const ink = glyphInk(g.accent);
            const playable = playableSet[g.slug];
            return (
              <button key={g.slug} onClick={() => playable && onOpen(g.slug)} style={{
                position: "relative", borderRadius: 18, background: "#fff", border: `2px solid ${playable ? PALETTE.felt : "#eee"}`, padding: 12,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 7, boxShadow: "0 4px 10px rgba(23,60,110,.08)",
                cursor: playable ? "pointer" : "default", opacity: playable ? 1 : 0.62, fontFamily: "Nunito, sans-serif", transition: "transform .12s, box-shadow .12s",
              }}
              onMouseEnter={(e) => { if (playable) { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 10px 20px rgba(23,60,110,.16)"; } }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 10px rgba(23,60,110,.08)"; }}>
                {g.isNew && <NewBadge style={{ position: "absolute", top: -8, right: -6 }} />}
                {playable && <span style={{ position: "absolute", top: 8, left: 8, width: 18, height: 18, borderRadius: 999, background: "#1c7a4a", display: "grid", placeItems: "center" }}><svg width="11" height="11" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z" /></svg></span>}
                <div style={{ width: 60, height: 60, borderRadius: 16, background: g.accent, display: "grid", placeItems: "center" }}><GameGlyph slug={g.slug} size={42} style={{ color: ink }} /></div>
                <span style={{ fontSize: 13, fontWeight: 900, color: PALETTE.steppe, textAlign: "center", lineHeight: 1.05 }}>{g.title}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: PALETTE.wolf, textAlign: "center", lineHeight: 1.1 }}>{g.kk}</span>
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: 18, textAlign: "center" }}>
          <button onClick={() => { if (confirm("Reset demo progress (points, unlocked stops)?")) { localStorage.removeItem(PROTO_KEY); location.reload(); } }}
            style={{ border: "none", background: "transparent", color: PALETTE.wolf, fontSize: 12.5, fontWeight: 700, cursor: "pointer", textDecoration: "underline", fontFamily: "Nunito, sans-serif" }}>Reset demo progress</button>
        </div>
      </main>
      <Toast toast={toast} />
    </div>
  );
}

/* ----------------------------------------------------------------------------
   ROUTER SHELL — hub ↔ game. Awards points back to the live profile.
---------------------------------------------------------------------------- */
function App() {
  const [profile, patch] = useProto();
  const [route, setRoute] = useState("hub"); // hub | <slug>

  const award = useCallback((pts) => { if (pts > 0) patch((p) => ({ xp: p.xp + pts })); }, [patch]);
  const back = useCallback(() => setRoute("hub"), []);

  const games = {
    "sound-it-out": GameSoundItOut,
    "where-kz": GameWhereKZ,
    "bazaar": GameBazaar,
    "jaryq-hunter": GameFlashlight,
  };
  const Game = games[route];

  return (
    <div style={{ width: "100%", height: "100%", overflow: route === "hub" ? "auto" : "hidden", background: route === "jaryq-hunter" ? "#06101f" : PALETTE.warm }}>
      {route === "hub"
        ? <Hub profile={profile} patch={patch} onOpen={setRoute} />
        : <Game onBack={back} onAward={award} />}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
