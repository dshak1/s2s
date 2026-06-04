/* s2s-directions-a.jsx — Directions 1–3 for the games hub.
   Each exports a component taking no props; rendered inside a DCArtboard. */

/* ============================================================
   DIRECTION 1 — TIDY GRID (polished baseline)
   The current /play approach, refined: clean 4-col grid, crisp
   chrome, gentle hover lift, progress on each tile.
   ============================================================ */
function DirTidyGrid() {
  return (
    <div style={{ width: "100%", height: "100%", background: PALETTE.warm, fontFamily: "Nunito, sans-serif", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <KidNav />
      <main style={{ flex: 1, padding: "30px 40px 40px", maxWidth: 1160, margin: "0 auto", width: "100%" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 22 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 40, fontWeight: 900, color: PALETTE.steppe, letterSpacing: -1 }}>Pick a game</h1>
            <p style={{ margin: "4px 0 0", fontSize: 18, color: PALETTE.wolf, fontWeight: 600 }}>Ten ways to learn Kazakh. Tap any tile to play.</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {["All", "Words", "Make", "Adventure"].map((t, i) => (
              <span key={t} style={{ padding: "8px 16px", borderRadius: 999, fontWeight: 800, fontSize: 14, background: i === 0 ? PALETTE.steppe : "transparent", color: i === 0 ? PALETTE.warm : PALETTE.steppe, border: i === 0 ? "none" : `2px solid ${PALETTE.feltDeep}` }}>{t}</span>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18 }}>
          {GAMES.map((g, i) => {
            const ink = glyphInk(g.accent);
            const pct = [80, 100, 45, 0, 60, 30, 100, 15, 0, 55][i];
            return (
              <div key={g.slug} style={{ background: g.accent, color: ink, borderRadius: 26, padding: 18, height: 196, display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: "0 8px 18px rgba(23,60,110,.16)", position: "relative", overflow: "hidden" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: ink, opacity: 0.95 }}>{g.kk}</span>
                  <GameGlyph slug={g.slug} size={48} style={{ color: ink, opacity: 0.95 }} />
                </div>
                <div>
                  <div style={{ fontSize: 19, fontWeight: 900, lineHeight: 1.05, color: g.accent === PALETTE.gold ? PALETTE.steppe700 : PALETTE.warm }}>{g.title}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: g.accent === PALETTE.gold ? PALETTE.steppe700 : PALETTE.warm, opacity: 0.82, marginTop: 2 }}>{g.blurb}</div>
                  <div style={{ marginTop: 10, height: 6, borderRadius: 999, background: "rgba(255,255,255,.25)" }}>
                    <div style={{ width: pct + "%", height: "100%", borderRadius: 999, background: PALETTE.gold }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

/* ============================================================
   DIRECTION 2 — STICKER BOOK (bubbly, tactile)
   Warm felt "album" page. Each game is a chunky sticker with a
   white die-cut border, slight rotation, peel shadow. Maximum joy.
   ============================================================ */
function DirStickerBook() {
  const rot = [-3, 2, -1.5, 3, -2.5, 1.5, -1, 2.5, -3, 1.5];
  return (
    <div style={{ width: "100%", height: "100%", fontFamily: "Nunito, sans-serif", overflow: "hidden", position: "relative", ...feltPaper() }}>
      <div style={{ position: "relative", padding: "34px 44px 44px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6 }}>
          <span style={{ background: PALETTE.gold, color: PALETTE.steppe700, fontWeight: 900, fontSize: 13, padding: "6px 14px", borderRadius: 999, transform: "rotate(-3deg)" }}>MY GAME ALBUM</span>
          <OrnamentBand color={PALETTE.feltDeep} unit={26} style={{ flex: 1 }} />
        </div>
        <h1 style={{ margin: "0 0 4px", fontSize: 48, fontWeight: 900, color: PALETTE.steppe, letterSpacing: -1.5 }}>Peel a game & play!</h1>
        <p style={{ margin: "0 0 24px", fontSize: 18, color: PALETTE.wolf, fontWeight: 700 }}>Collect a sticker every time you win. 4 of 10 unlocked.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 26, rowGap: 34 }}>
          {GAMES.map((g, i) => {
            const ink = glyphInk(g.accent);
            const earned = [true, true, false, false, true, false, false, false, false, true][i];
            return (
              <div key={g.slug} style={{ transform: `rotate(${rot[i]}deg)`, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <div style={{ position: "relative", width: 150, height: 150, borderRadius: 34, background: "#fff", padding: 9, boxShadow: "0 12px 22px rgba(23,60,110,.2)" }}>
                  <div style={{ width: "100%", height: "100%", borderRadius: 26, background: g.accent, color: ink, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, filter: earned ? "none" : "grayscale(.7) opacity(.65)" }}>
                    <GameGlyph slug={g.slug} size={70} style={{ color: ink }} />
                    <span style={{ fontSize: 12, fontWeight: 800, color: g.accent === PALETTE.gold ? PALETTE.steppe700 : PALETTE.warm }}>{g.kk}</span>
                  </div>
                  {!earned && (
                    <span style={{ position: "absolute", top: -8, right: -8, width: 34, height: 34, borderRadius: 999, background: PALETTE.warm, border: `3px solid ${PALETTE.feltDeep}`, display: "grid", placeItems: "center" }}>
                      <LockIcon />
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 15, fontWeight: 900, color: PALETTE.steppe, textAlign: "center", lineHeight: 1.05 }}>{g.title}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={PALETTE.wolf} strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" />
    </svg>
  );
}

/* ============================================================
   DIRECTION 3 — STEPPE TRAIL MAP (journey / adventure)
   Games are stops on a winding gold trail across the steppe.
   Numbered pins, locked nodes, a wandering snow leopard. Quest feel.
   ============================================================ */
function DirTrailMap() {
  // Hand-placed nodes along an S-curve trail (in a 1240x860 scene).
  const nodes = [
    { x: 130, y: 690 }, { x: 270, y: 560 }, { x: 200, y: 410 }, { x: 360, y: 300 },
    { x: 540, y: 360 }, { x: 660, y: 230 }, { x: 820, y: 300 }, { x: 940, y: 180 },
    { x: 1060, y: 320 }, { x: 1120, y: 540 },
  ];
  const path = `M${nodes[0].x} ${nodes[0].y} ` + nodes.slice(1).map((n, i) => {
    const p = nodes[i]; const mx = (p.x + n.x) / 2;
    return `Q ${mx} ${p.y} ${n.x} ${n.y}`;
  }).join(" ");
  const unlocked = 5;
  return (
    <div style={{ width: "100%", height: "100%", overflow: "hidden", position: "relative", fontFamily: "Nunito, sans-serif", background: `linear-gradient(${PALETTE.steppe} 0%, #2a63a8 46%, #4a8f5a 47%, #6fae6a 100%)` }}>
      {/* sky ornament + sun */}
      <div style={{ position: "absolute", top: 26, right: 40, width: 90, height: 90, borderRadius: 999, background: PALETTE.gold, boxShadow: "0 0 0 14px rgba(255,215,0,.18)" }} />
      <div style={{ position: "absolute", top: 28, left: 44, color: PALETTE.warm }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: PALETTE.gold, letterSpacing: 1 }}>ДАЛА КВЕСІ</div>
        <h1 style={{ margin: "2px 0 0", fontSize: 44, fontWeight: 900, letterSpacing: -1 }}>The Steppe Trail</h1>
        <p style={{ margin: "6px 0 0", fontSize: 17, fontWeight: 700, opacity: 0.92, maxWidth: 460 }}>Follow the path. Each stop is a new game. Beat it to light the way to the next.</p>
      </div>
      {/* distant hills */}
      <svg viewBox="0 0 1240 860" width="100%" height="100%" style={{ position: "absolute", inset: 0 }} preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 470 Q200 380 420 460 T860 440 T1240 470 V860 H0 Z" fill="rgba(255,255,255,.06)" />
        {/* the trail */}
        <path d={path} fill="none" stroke={PALETTE.warm} strokeWidth="20" strokeLinecap="round" opacity="0.35" />
        <path d={path} fill="none" stroke={PALETTE.gold} strokeWidth="8" strokeLinecap="round" strokeDasharray="2 20" />
      </svg>
      {/* nodes */}
      {GAMES.map((g, i) => {
        const n = nodes[i]; const ink = glyphInk(g.accent);
        const locked = i >= unlocked; const current = i === unlocked - 1;
        return (
          <div key={g.slug} style={{ position: "absolute", left: n.x, top: n.y, transform: "translate(-50%,-50%)", textAlign: "center", width: 150 }}>
            <div style={{ position: "relative", width: 92, height: 92, margin: "0 auto", borderRadius: 999, background: locked ? PALETTE.wolf : g.accent, color: ink, display: "grid", placeItems: "center", boxShadow: current ? `0 0 0 8px rgba(255,215,0,.5), 0 10px 22px rgba(0,0,0,.3)` : "0 10px 22px rgba(0,0,0,.3)", border: `4px solid ${PALETTE.warm}`, filter: locked ? "saturate(.4)" : "none" }}>
              <GameGlyph slug={g.slug} size={50} style={{ color: locked ? "rgba(255,255,255,.6)" : ink }} />
              <span style={{ position: "absolute", top: -10, left: -10, width: 30, height: 30, borderRadius: 999, background: PALETTE.warm, color: PALETTE.steppe700, fontWeight: 900, fontSize: 14, display: "grid", placeItems: "center", boxShadow: "0 2px 6px rgba(0,0,0,.25)" }}>{i + 1}</span>
              {locked && <span style={{ position: "absolute", bottom: -8, right: -8, width: 28, height: 28, borderRadius: 999, background: PALETTE.warm, display: "grid", placeItems: "center", boxShadow: "0 2px 6px rgba(0,0,0,.25)" }}><LockIcon /></span>}
            </div>
            <div style={{ marginTop: 8, display: "inline-block", background: "rgba(15,39,72,.72)", color: PALETTE.warm, fontWeight: 800, fontSize: 13, padding: "4px 10px", borderRadius: 999, backdropFilter: "blur(2px)" }}>{g.title}</div>
          </div>
        );
      })}
    </div>
  );
}

// felt paper texture for the sticker album page
function feltPaper() {
  return {
    backgroundColor: PALETTE.felt,
    backgroundImage:
      "radial-gradient(circle at 18% 24%, rgba(30,77,140,.06) 0 2px, transparent 3px)," +
      "radial-gradient(circle at 62% 70%, rgba(200,16,46,.05) 0 2px, transparent 3px)," +
      "radial-gradient(circle at 84% 30%, rgba(30,77,140,.05) 0 2px, transparent 3px)",
    backgroundSize: "46px 46px, 60px 60px, 52px 52px",
  };
}

Object.assign(window, { DirTidyGrid, DirStickerBook, DirTrailMap });
