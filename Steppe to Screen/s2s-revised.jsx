/* s2s-revised.jsx — v2 hub layouts after workshop feedback.
   Silk Road weekly-unlock framing, English→Kazakh roster, NEW badges. */

function NewBadge({ style }) {
  return (
    <span style={{ background: PALETTE.gold, color: PALETTE.steppe700, fontSize: 10, fontWeight: 900, letterSpacing: 0.5, padding: "3px 7px", borderRadius: 999, ...style }}>NEW</span>
  );
}

// Row of week dots for the Silk Road progress.
function WeekDots({ total = 8, done = 3, size = 14 }) {
  return (
    <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} style={{
          width: size, height: size, borderRadius: 999,
          background: i < done ? PALETTE.gold : "rgba(255,255,255,.18)",
          boxShadow: i === done ? `0 0 0 4px rgba(255,215,0,.35)` : "none",
          border: i === done ? `2px solid ${PALETTE.gold}` : "none",
        }} />
      ))}
    </div>
  );
}

// In-person code unlock control.
function CodeUnlock({ compact }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,.14)", borderRadius: 999, padding: compact ? "6px 6px 6px 16px" : "8px 8px 8px 18px" }}>
        <span style={{ fontWeight: 800, fontSize: compact ? 13 : 15, color: PALETTE.warm, letterSpacing: 3, opacity: 0.9 }}>· · · ·</span>
        <span style={{ background: PALETTE.gold, color: PALETTE.steppe700, fontWeight: 900, fontSize: compact ? 13 : 15, padding: compact ? "6px 14px" : "8px 18px", borderRadius: 999 }}>Unlock</span>
      </div>
      {!compact && <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.8)" }}>Enter today's workshop code</span>}
    </div>
  );
}

/* ============================================================
   REVISED HUB · OPTION A — HERO ("Silk Road" weekly journey)
   ============================================================ */
function DirHeroV2() {
  return (
    <div style={{ width: "100%", height: "100%", background: PALETTE.warm, fontFamily: "Nunito, sans-serif", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <KidNav />
      <main style={{ flex: 1, padding: "26px 40px 34px", maxWidth: 1160, margin: "0 auto", width: "100%" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 20, marginBottom: 26 }}>
          {/* Silk Road hero */}
          <div style={{ borderRadius: 30, padding: 28, color: PALETTE.warm, position: "relative", overflow: "hidden", boxShadow: "0 14px 30px rgba(23,60,110,.25)", ...feltBg(PALETTE.steppe) }}>
            <div style={{ position: "absolute", right: -24, top: -24, opacity: 0.16 }}><GameGlyph slug="where-kz" size={200} style={{ color: PALETTE.gold }} /></div>
            <div style={{ position: "relative" }}>
              <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: 2, color: PALETTE.gold }}>SILK ROAD · АТА ЖОЛЫ · WEEK 3 OF 8</div>
              <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: -0.8, marginTop: 4 }}>This week: the Almaty stop</div>
              <div style={{ margin: "14px 0", }}><WeekDots /></div>
              <p style={{ fontSize: 15, fontWeight: 600, opacity: 0.9, maxWidth: 460, margin: "0 0 16px", lineHeight: 1.45 }}>
                Come to each workshop to earn a code and unlock the next stop on the map. Clear its games, then replay anytime for more points.
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <span style={{ background: PALETTE.gold, color: PALETTE.steppe700, fontWeight: 900, fontSize: 17, padding: "13px 26px", borderRadius: 999, boxShadow: "0 6px 0 rgba(0,0,0,.18)" }}>▶ Play this week</span>
                <CodeUnlock />
              </div>
            </div>
          </div>
          {/* reward + points */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ flex: 1, borderRadius: 24, background: PALETTE.felt, padding: 18, display: "flex", alignItems: "center", gap: 14, boxShadow: "0 8px 18px rgba(23,60,110,.12)" }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: PALETTE.gold, display: "grid", placeItems: "center", flex: "0 0 auto" }}><GameGlyph slug="yurt-builder" size={46} style={{ color: PALETTE.steppe700 }} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: PALETTE.goldDeep }}>YOUR YURT · REWARD</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: PALETTE.steppe }}>6 of 9 letters mastered</div>
                <div style={{ marginTop: 6, height: 8, borderRadius: 999, background: "rgba(0,0,0,.08)" }}>
                  <div style={{ width: "67%", height: "100%", borderRadius: 999, background: PALETTE.gold }} />
                </div>
              </div>
            </div>
            <div style={{ flex: 1, borderRadius: 24, padding: 18, display: "flex", alignItems: "center", gap: 14, color: PALETTE.warm, boxShadow: "0 8px 18px rgba(23,60,110,.12)", ...feltBg(PALETTE.steppe700) }}>
              <div style={{ width: 64, height: 64, borderRadius: 999, background: "rgba(255,255,255,.14)", display: "grid", placeItems: "center", flex: "0 0 auto" }}><Star16 color={PALETTE.gold} /></div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 900, color: PALETTE.gold }}>POINTS</div>
                <div style={{ fontSize: 28, fontWeight: 900 }}>1,240</div>
                <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.85 }}>Replay any game for more ↺</div>
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: PALETTE.steppe }}>This week's games</h2>
          <span style={{ fontSize: 14, fontWeight: 800, color: PALETTE.wolf }}>English → Kazakh · tap to play</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14 }}>
          {REVISED_GAMES.map((g) => {
            const ink = glyphInk(g.accent);
            return (
              <div key={g.slug} style={{ position: "relative", borderRadius: 20, background: "#fff", border: `2px solid ${PALETTE.felt}`, padding: 12, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, boxShadow: "0 4px 10px rgba(23,60,110,.08)" }}>
                {g.isNew && <NewBadge style={{ position: "absolute", top: -8, right: -6 }} />}
                <div style={{ width: 62, height: 62, borderRadius: 16, background: g.accent, display: "grid", placeItems: "center" }}><GameGlyph slug={g.slug} size={42} style={{ color: ink }} /></div>
                <span style={{ fontSize: 13, fontWeight: 900, color: PALETTE.steppe, textAlign: "center", lineHeight: 1.05 }}>{g.title}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: PALETTE.wolf, textAlign: "center", lineHeight: 1.1 }}>{g.kk}</span>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

/* ============================================================
   REVISED HUB · OPTION B — SHELVES (mood-first, 4 categories)
   ============================================================ */
function DirShelvesV2() {
  return (
    <div style={{ width: "100%", height: "100%", background: PALETTE.warm, fontFamily: "Nunito, sans-serif", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <KidNav />
      {/* slim Silk Road banner */}
      <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "12px 40px", color: PALETTE.warm, ...feltBg(PALETTE.steppe700) }}>
        <span style={{ fontSize: 13, fontWeight: 900, letterSpacing: 1.5, color: PALETTE.gold }}>SILK ROAD · WEEK 3 / 8</span>
        <WeekDots size={12} />
        <span style={{ fontSize: 13, fontWeight: 700, opacity: 0.85 }}>Unlock the next stop with today's workshop code →</span>
        <div style={{ marginLeft: "auto" }}><CodeUnlock compact /></div>
      </div>
      <main style={{ flex: 1, padding: "22px 40px 30px", maxWidth: 1160, margin: "0 auto", width: "100%" }}>
        <h1 style={{ margin: "0 0 16px", fontSize: 34, fontWeight: 900, color: PALETTE.steppe, letterSpacing: -1 }}>What do you feel like today?</h1>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {GROUPS_V2.map((sh) => {
            const items = REVISED_GAMES.filter((g) => g.group === sh.key);
            const headInk = sh.color === PALETTE.gold ? PALETTE.steppe700 : sh.color;
            return (
              <section key={sh.key} style={{ borderRadius: 24, padding: "16px 22px 22px", background: "#fff", boxShadow: "0 8px 20px rgba(23,60,110,.1)", borderTop: `6px solid ${sh.color}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <span style={{ width: 40, height: 40, borderRadius: 12, background: sh.color, display: "grid", placeItems: "center" }}><OrnamentUnit size={28} color={sh.color === PALETTE.gold ? PALETTE.steppe700 : PALETTE.gold} /></span>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: headInk, lineHeight: 1 }}>{sh.key} <span style={{ color: PALETTE.wolf, fontSize: 14 }}>· {sh.kk}</span></div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: PALETTE.wolf }}>{sh.blurb}</div>
                  </div>
                  <span style={{ marginLeft: "auto", fontSize: 13, fontWeight: 800, color: headInk }}>{items.length} {items.length === 1 ? "game" : "games"} →</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
                  {items.map((g) => {
                    const ink = glyphInk(g.accent);
                    return (
                      <div key={g.slug} style={{ position: "relative", borderRadius: 18, background: g.accent, color: ink, padding: 14, display: "flex", alignItems: "center", gap: 12, minHeight: 84, boxShadow: "0 6px 14px rgba(23,60,110,.16)" }}>
                        {g.isNew && <NewBadge style={{ position: "absolute", top: -8, right: -6 }} />}
                        <GameGlyph slug={g.slug} size={46} style={{ color: ink, flex: "0 0 auto" }} />
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 900, color: g.accent === PALETTE.gold ? PALETTE.steppe700 : PALETTE.warm, lineHeight: 1.05 }}>{g.title}</div>
                          <div style={{ fontSize: 11.5, fontWeight: 700, color: g.accent === PALETTE.gold ? PALETTE.steppe700 : PALETTE.warm, opacity: 0.82, marginTop: 2 }}>{g.en}</div>
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

Object.assign(window, { DirHeroV2, DirShelvesV2, NewBadge, WeekDots, CodeUnlock });
