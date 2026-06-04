/* s2s-directions-b.jsx — Directions 4–6 for the games hub. */

/* ============================================================
   DIRECTION 4 — FELT & ORNAMENT (craft / textile)
   Deep steppe felt page. Each game is a stitched felt patch with a
   gold dashed border — exactly the visual language of the in-app
   vocab cards — laced together with ram's-horn ornament bands.
   ============================================================ */
function DirFeltCraft() {
  return (
    <div style={{ width: "100%", height: "100%", overflow: "hidden", fontFamily: "Nunito, sans-serif", color: PALETTE.warm, ...feltBg(PALETTE.steppe) }}>
      <div style={{ padding: "34px 46px 40px" }}>
        <div style={{ textAlign: "center", marginBottom: 4 }}>
          <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 3, color: PALETTE.gold }}>ОЙНА · PLAY</div>
          <h1 style={{ margin: "4px 0 0", fontSize: 46, fontWeight: 900, letterSpacing: -1 }}>The Game Felt</h1>
        </div>
        <OrnamentBand color={PALETTE.gold} unit={30} style={{ margin: "10px 0 26px", opacity: 0.9 }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 22 }}>
          {GAMES.map((g) => (
            <div key={g.slug} style={{ position: "relative", borderRadius: 22, background: g.accent, padding: 16, minHeight: 188, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, boxShadow: "0 8px 0 rgba(0,0,0,.18), inset 0 0 0 3px rgba(255,255,255,.06)" }}>
              {/* dashed gold stitch border, matching the in-app vocab SVGs */}
              <div style={{ position: "absolute", inset: 7, borderRadius: 15, border: `3px dashed ${PALETTE.gold}`, opacity: 0.85, pointerEvents: "none" }} />
              <GameGlyph slug={g.slug} size={66} style={{ color: glyphInk(g.accent) }} />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: g.accent === PALETTE.gold ? PALETTE.steppe700 : PALETTE.warm, lineHeight: 1.05 }}>{g.title}</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: PALETTE.gold, marginTop: 2 }}>{g.kk}</div>
              </div>
            </div>
          ))}
        </div>
        <OrnamentBand color={PALETTE.gold} unit={30} style={{ marginTop: 26, opacity: 0.9 }} />
      </div>
    </div>
  );
}

/* ============================================================
   DIRECTION 5 — HERO SPOTLIGHT + RAIL ("Jump back in")
   Big featured continue-card on the left, daily challenge + streak
   on the right, all ten games as a compact rail beneath.
   ============================================================ */
function DirHeroSpotlight() {
  const featured = GAMES[0]; // Sözdik Match, in progress
  return (
    <div style={{ width: "100%", height: "100%", background: PALETTE.warm, fontFamily: "Nunito, sans-serif", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <KidNav />
      <main style={{ flex: 1, padding: "28px 40px 36px", maxWidth: 1160, margin: "0 auto", width: "100%" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", gap: 22, marginBottom: 28 }}>
          {/* hero */}
          <div style={{ borderRadius: 30, background: featured.accent, color: PALETTE.warm, padding: 30, display: "flex", gap: 22, alignItems: "center", boxShadow: "0 14px 30px rgba(23,60,110,.25)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", right: -30, bottom: -30, opacity: 0.16 }}><GameGlyph slug={featured.slug} size={220} style={{ color: PALETTE.gold }} /></div>
            <div style={{ width: 116, height: 116, borderRadius: 26, background: "rgba(255,255,255,.12)", display: "grid", placeItems: "center", flex: "0 0 auto" }}>
              <GameGlyph slug={featured.slug} size={78} style={{ color: PALETTE.gold }} />
            </div>
            <div style={{ position: "relative" }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: PALETTE.gold, letterSpacing: 1 }}>JUMP BACK IN · {featured.kk}</span>
              <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: -0.8, lineHeight: 1.05, marginTop: 2 }}>{featured.title}</div>
              <div style={{ fontSize: 16, fontWeight: 600, opacity: 0.9, marginTop: 4 }}>{featured.blurb}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
                <span style={{ background: PALETTE.gold, color: PALETTE.steppe700, fontWeight: 900, fontSize: 17, padding: "12px 26px", borderRadius: 999, boxShadow: "0 6px 0 rgba(0,0,0,.18)" }}>▶ Continue</span>
                <span style={{ fontSize: 14, fontWeight: 800, opacity: 0.9 }}>Level 4 of 5 · 80%</span>
              </div>
            </div>
          </div>
          {/* side cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ flex: 1, borderRadius: 24, background: PALETTE.felt, padding: 18, display: "flex", alignItems: "center", gap: 14, boxShadow: "0 8px 18px rgba(23,60,110,.12)" }}>
              <div style={{ width: 60, height: 60, borderRadius: 16, background: PALETTE.terra, display: "grid", placeItems: "center", flex: "0 0 auto" }}><GameGlyph slug="aitys" size={42} style={{ color: PALETTE.gold }} /></div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: PALETTE.terra }}>DAILY CHALLENGE</div>
                <div style={{ fontSize: 19, fontWeight: 900, color: PALETTE.steppe }}>Aitys Battle</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: PALETTE.wolf }}>Win for +50 ⭐ bonus</div>
              </div>
            </div>
            <div style={{ flex: 1, borderRadius: 24, padding: 18, display: "flex", alignItems: "center", gap: 14, boxShadow: "0 8px 18px rgba(23,60,110,.12)", ...feltBg(PALETTE.steppe700), color: PALETTE.warm }}>
              <div style={{ width: 60, height: 60, borderRadius: 999, background: "rgba(255,255,255,.14)", display: "grid", placeItems: "center", flex: "0 0 auto" }}><Flame16 color={PALETTE.gold} /></div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: PALETTE.gold }}>WEEKLY STREAK</div>
                <div style={{ fontSize: 28, fontWeight: 900 }}>6 weeks 🔥</div>
                <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.85 }}>Play today to keep it alive</div>
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: PALETTE.steppe }}>All ten games</h2>
          <span style={{ fontSize: 14, fontWeight: 800, color: PALETTE.wolf }}>Сөздік · Make · Adventure</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14 }}>
          {GAMES.map((g) => {
            const ink = glyphInk(g.accent);
            return (
              <div key={g.slug} style={{ borderRadius: 20, background: "#fff", border: `2px solid ${PALETTE.felt}`, padding: 12, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, boxShadow: "0 4px 10px rgba(23,60,110,.08)" }}>
                <div style={{ width: 64, height: 64, borderRadius: 16, background: g.accent, display: "grid", placeItems: "center" }}><GameGlyph slug={g.slug} size={44} style={{ color: ink }} /></div>
                <span style={{ fontSize: 13, fontWeight: 900, color: PALETTE.steppe, textAlign: "center", lineHeight: 1.05 }}>{g.title}</span>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

/* ============================================================
   DIRECTION 6 — CATEGORY SHELVES (toy-shelf grouping)
   Games sorted onto three playful shelves by what they teach:
   Words, Make, Adventure. Each shelf is its own colored band.
   ============================================================ */
function DirShelves() {
  const shelves = [
    { key: "Words", kk: "Сөздер", color: PALETTE.steppe, blurb: "Learn & match vocabulary" },
    { key: "Make", kk: "Жаса", color: PALETTE.terra, blurb: "Draw, build & create" },
    { key: "Adventure", kk: "Шытырман", color: PALETTE.steppe700, blurb: "Explore & hunt across the room" },
  ];
  return (
    <div style={{ width: "100%", height: "100%", background: PALETTE.warm, fontFamily: "Nunito, sans-serif", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <KidNav />
      <main style={{ flex: 1, padding: "26px 40px 36px", maxWidth: 1160, margin: "0 auto", width: "100%" }}>
        <h1 style={{ margin: "0 0 18px", fontSize: 38, fontWeight: 900, color: PALETTE.steppe, letterSpacing: -1 }}>What do you feel like today?</h1>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {shelves.map((sh) => {
            const items = GAMES.filter((g) => g.group === sh.key);
            return (
              <section key={sh.key} style={{ borderRadius: 28, padding: "20px 24px 26px", background: "#fff", boxShadow: "0 8px 20px rgba(23,60,110,.1)", borderTop: `6px solid ${sh.color}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <span style={{ width: 44, height: 44, borderRadius: 14, background: sh.color, color: PALETTE.gold, display: "grid", placeItems: "center", fontWeight: 900 }}><OrnamentUnit size={30} color={PALETTE.gold} /></span>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: sh.color, lineHeight: 1 }}>{sh.key} <span style={{ color: PALETTE.wolf, fontSize: 16 }}>· {sh.kk}</span></div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: PALETTE.wolf }}>{sh.blurb}</div>
                  </div>
                  <span style={{ marginLeft: "auto", fontSize: 13, fontWeight: 800, color: sh.color }}>{items.length} games →</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
                  {items.map((g) => {
                    const ink = glyphInk(g.accent);
                    return (
                      <div key={g.slug} style={{ borderRadius: 20, background: g.accent, color: ink, padding: 16, display: "flex", alignItems: "center", gap: 14, minHeight: 92, boxShadow: "0 6px 14px rgba(23,60,110,.16)" }}>
                        <GameGlyph slug={g.slug} size={52} style={{ color: ink, flex: "0 0 auto" }} />
                        <div>
                          <div style={{ fontSize: 17, fontWeight: 900, color: g.accent === PALETTE.gold ? PALETTE.steppe700 : PALETTE.warm, lineHeight: 1.05 }}>{g.title}</div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: g.accent === PALETTE.gold ? PALETTE.steppe700 : PALETTE.warm, opacity: 0.82 }}>{g.blurb}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}

Object.assign(window, { DirFeltCraft, DirHeroSpotlight, DirShelves });
