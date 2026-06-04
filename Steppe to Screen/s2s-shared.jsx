/* s2s-shared.jsx — Steppe to Screen brand kit shared across all directions.
   Palette, fonts, the 10 games, gold line-art glyphs, ornament motifs, kid header. */

const PALETTE = {
  steppe: "#1e4d8c",
  steppe700: "#173c6e",
  steppe900: "#0f2748",
  gold: "#ffd700",
  goldDeep: "#e9b400",
  warm: "#faf6e9",
  felt: "#e8ddc1",
  feltDeep: "#d8c9a3",
  terra: "#c8102e",
  wolf: "#5b6770",
  ink: "#1b1b1b",
};

// The ten games (real content from /content/games.ts). accent = tile color.
const GAMES = [
  { slug: "sozdik-match", title: "Sözdik Match", kk: "Сөздік сәйкестік", blurb: "Drag words to their pictures.", accent: PALETTE.steppe, group: "Words" },
  { slug: "tanba-studio", title: "Tańba Studio", kk: "Таңба студиясы", blurb: "Draw your own tribal mark.", accent: PALETTE.terra, group: "Make" },
  { slug: "dala-quest", title: "Dala Quest", kk: "Дала квесі", blurb: "Explore the steppe map.", accent: PALETTE.steppe700, group: "Adventure" },
  { slug: "jaryq-hunter", title: "Jaryq Hunter", kk: "Жарық аңшысы", blurb: "Find words in the dark.", accent: PALETTE.ink, group: "Adventure" },
  { slug: "memory-match", title: "Esten Qaldyrma", kk: "Естен қалдырма", blurb: "Flip cards, find the pairs.", accent: PALETTE.steppe, group: "Words" },
  { slug: "aitys", title: "Aitys Battle", kk: "Айтыс", blurb: "Fill the rhyming couplet.", accent: PALETTE.terra, group: "Words" },
  { slug: "falling-sozder", title: "Falling Sözder", kk: "Құлайтын сөздер", blurb: "Catch the falling words.", accent: PALETTE.steppe700, group: "Words" },
  { slug: "yurt-builder", title: "Yurt Builder", kk: "Үй құрушы", blurb: "Master letters, build a yurt.", accent: PALETTE.gold, group: "Make" },
  { slug: "snow-leopard", title: "Snow Leopard Patrol", kk: "Қар барысы", blurb: "Scan QR clues, collect paws.", accent: PALETTE.wolf, group: "Adventure" },
  { slug: "story-maker", title: "Story Maker", kk: "Әңгіме жасаушы", blurb: "Build a comic from your art.", accent: PALETTE.steppe, group: "Make" },
];

// Glyph stroke color: gold on dark tiles, deep-steppe on the gold tile.
function glyphInk(accent) {
  return accent === PALETTE.gold ? PALETTE.steppe700 : PALETTE.gold;
}

// Gold line-art glyphs — same visual language as the in-app vocab SVGs
// (currentColor stroke, round caps, schematic). One per game.
function GameGlyph({ slug, size = 64, style }) {
  const s = { fill: "none", stroke: "currentColor", strokeWidth: 6, strokeLinecap: "round", strokeLinejoin: "round" };
  const fill = { fill: "currentColor", stroke: "none" };
  const art = {
    "sozdik-match": (
      <g>
        <rect x="10" y="32" width="32" height="28" rx="6" {...s} />
        <line x1="18" y1="42" x2="34" y2="42" {...s} />
        <line x1="18" y1="50" x2="30" y2="50" {...s} />
        <rect x="56" y="36" width="34" height="34" rx="6" {...s} />
        <circle cx="80" cy="48" r="4" {...s} />
        <path d="M58 68 L70 54 L78 62 L86 50" {...s} />
        <path d="M42 50 h14" strokeDasharray="2 7" {...s} />
      </g>
    ),
    "tanba-studio": (
      <g>
        <path d="M40 78 C18 78 16 46 40 44 C58 42 60 64 46 66 C38 67 36 56 44 54" {...s} />
        <line x1="60" y1="40" x2="80" y2="20" strokeWidth="8" {...s} />
        <circle cx="58" cy="42" r="3.5" {...fill} />
      </g>
    ),
    "dala-quest": (
      <g>
        <path d="M12 74 Q40 54 72 70" {...s} />
        <path d="M60 70 V30" {...s} />
        <path d="M60 30 H82 L74 39 L82 48 H60" {...s} />
        <circle cx="22" cy="74" r="2.6" {...fill} />
        <circle cx="34" cy="70" r="2.6" {...fill} />
        <circle cx="46" cy="70" r="2.6" {...fill} />
      </g>
    ),
    "jaryq-hunter": (
      <g>
        <rect x="42" y="64" width="18" height="20" rx="4" {...s} />
        <path d="M44 64 L28 30" {...s} />
        <path d="M58 64 L74 30" {...s} />
        <path d="M28 30 Q51 18 74 30" {...s} />
        <circle cx="51" cy="44" r="4" {...fill} />
      </g>
    ),
    "memory-match": (
      <g>
        <rect x="12" y="26" width="30" height="46" rx="6" {...s} />
        <rect x="50" y="26" width="30" height="46" rx="6" {...s} />
        <circle cx="27" cy="49" r="8" {...s} />
        <circle cx="65" cy="49" r="8" {...s} />
      </g>
    ),
    "aitys": (
      <g>
        <rect x="10" y="22" width="44" height="28" rx="9" {...s} />
        <path d="M22 50 L18 60 L32 50" {...s} />
        <rect x="48" y="48" width="42" height="26" rx="9" {...s} />
        <path d="M78 74 L82 84 L68 74" {...s} />
      </g>
    ),
    "falling-sozder": (
      <g>
        <path d="M28 60 H72 L64 84 H36 Z" {...s} />
        <line x1="24" y1="60" x2="76" y2="60" {...s} />
        <circle cx="44" cy="20" r="4" {...fill} />
        <circle cx="58" cy="34" r="4" {...fill} />
        <circle cx="50" cy="48" r="4" {...fill} />
      </g>
    ),
    "yurt-builder": (
      <g>
        <path d="M18 62 Q50 18 82 62" {...s} />
        <path d="M18 62 V82 H82 V62" {...s} />
        <path d="M42 82 V66 H58 V82" {...s} />
        <circle cx="50" cy="30" r="7" {...s} />
        <path d="M44 30 H56 M50 24 V36" {...s} />
      </g>
    ),
    "snow-leopard": (
      <g>
        <ellipse cx="50" cy="64" rx="15" ry="12" {...fill} />
        <circle cx="30" cy="44" r="6.5" {...fill} />
        <circle cx="44" cy="34" r="6.5" {...fill} />
        <circle cx="58" cy="34" r="6.5" {...fill} />
        <circle cx="72" cy="44" r="6.5" {...fill} />
      </g>
    ),
    "story-maker": (
      <g>
        <rect x="16" y="22" width="68" height="56" rx="7" {...s} />
        <line x1="50" y1="22" x2="50" y2="78" {...s} />
        <line x1="16" y1="50" x2="84" y2="50" {...s} />
        <path d="M33 34 l3 6 6 1 -4.5 4 1 6 -5.5 -3 -5.5 3 1 -6 -4.5 -4 6 -1 z" {...fill} />
      </g>
    ),
    // NEW games ---------------------------------------------------------
    "sound-it-out": (
      <g>
        <path d="M20 42 H32 L48 28 V72 L32 58 H20 Z" {...s} />
        <path d="M58 38 Q68 50 58 62" {...s} />
        <path d="M68 28 Q86 50 68 72" {...s} />
      </g>
    ),
    "where-kz": (
      <g>
        <path d="M50 20 C36 20 28 31 28 44 C28 60 50 80 50 80 C50 80 72 60 72 44 C72 31 64 20 50 20 Z" {...s} />
        <circle cx="50" cy="43" r="8" {...s} />
        <path d="M22 86 H78" strokeDasharray="2 8" {...s} />
      </g>
    ),
    "bazaar": (
      <g>
        <path d="M50 18 L82 42 H18 Z" {...s} />
        <path d="M26 42 V74 H74 V42" {...s} />
        <path d="M42 74 V58 H58 V74" {...s} />
        <circle cx="35" cy="52" r="3.5" {...fill} />
        <circle cx="65" cy="52" r="3.5" {...fill} />
      </g>
    ),
  };
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={style} aria-hidden="true">
      {art[slug]}
    </svg>
  );
}

// Koshkar-muiz (ram's horns) — a single repeating ornament unit.
function OrnamentUnit({ size = 40, color = PALETTE.gold, style }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={style} aria-hidden="true">
      <path d="M50 78 C50 60 30 60 30 44 C30 30 48 30 48 44 C48 52 40 52 40 46"
        fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" />
      <path d="M50 78 C50 60 70 60 70 44 C70 30 52 30 52 44 C52 52 60 52 60 46"
        fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

// Horizontal ornament band built from repeated units.
function OrnamentBand({ color = PALETTE.gold, unit = 34, gap = 6, style }) {
  return (
    <div style={{ display: "flex", gap, justifyContent: "center", alignItems: "center", flexWrap: "nowrap", overflow: "hidden", ...style }}>
      {Array.from({ length: 40 }).map((_, i) => (
        <OrnamentUnit key={i} size={unit} color={color} style={{ flex: "0 0 auto", transform: i % 2 ? "scaleX(-1)" : "none", opacity: 0.85 }} />
      ))}
    </div>
  );
}

// Kid top-nav used by directions that want the in-app chrome.
function KidNav({ bg = PALETTE.steppe, fg = PALETTE.warm, xp = 1240, streak = 6, name = "Aiym" }) {
  return (
    <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: bg, color: fg, padding: "14px 28px", boxShadow: "0 4px 14px rgba(0,0,0,.18)" }}>
      <div style={{ fontWeight: 900, fontSize: 26, letterSpacing: -0.5 }}>
        Steppe<span style={{ color: PALETTE.gold }}>2</span>Screen
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,.15)", borderRadius: 999, padding: "7px 14px", fontWeight: 800, fontSize: 16 }}>
          <Star16 color={PALETTE.gold} /> {xp.toLocaleString()}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,.15)", borderRadius: 999, padding: "7px 14px", fontWeight: 800, fontSize: 16 }}>
          <Flame16 color={PALETTE.gold} /> {streak}
        </span>
        <span style={{ width: 44, height: 44, borderRadius: 999, background: PALETTE.gold, color: PALETTE.steppe700, display: "grid", placeItems: "center", fontWeight: 900, fontSize: 18, boxShadow: "inset 0 0 0 3px rgba(255,255,255,.4)" }}>
          {name[0]}
        </span>
      </div>
    </header>
  );
}

function Star16({ color }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17.8 5.9 21.4l1.5-6.8L2.2 9l6.9-.7z" />
    </svg>
  );
}
function Flame16({ color }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M12 2c1 3-2 4-2 7a2 2 0 104 0c0 0 4 2 4 7a6 6 0 11-12 0c0-4 4-6 4-9 0-1 1-2 2-2z" />
    </svg>
  );
}

// Felt dot texture as an inline style background (mirrors .felt-pattern).
function feltBg(base = PALETTE.steppe) {
  return {
    backgroundColor: base,
    backgroundImage:
      "radial-gradient(circle at 20% 30%, rgba(255,215,0,.18) 0 2px, transparent 3px)," +
      "radial-gradient(circle at 70% 60%, rgba(255,255,255,.12) 0 2px, transparent 3px)," +
      "radial-gradient(circle at 40% 80%, rgba(255,215,0,.12) 0 2px, transparent 3px)",
    backgroundSize: "28px 28px",
  };
}

Object.assign(window, { PALETTE, GAMES, GameGlyph, glyphInk, OrnamentUnit, OrnamentBand, KidNav, Star16, Flame16, feltBg });

// ===========================================================================
// REVISED ROSTER (v2) — after workshop feedback.
//   • English → Kazakh throughout; the Kazakh alphabet is the point.
//   • Aitys removed (didn't rhyme). Tańba → "Design Your Avatar" (a maker tool,
//     not a scored game). Dala Quest becomes the Silk Road progression layer.
//   • New: Sound It Out (letter→sound), Where in Kazakhstan? (photo→map),
//     Steppe Bazaar (food + numbers).
// ===========================================================================
const REVISED_GAMES = [
  // Words & Letters
  { slug: "sound-it-out", title: "Sound It Out", kk: "Дыбыс", en: "Hear it, tap the matching Kazakh letter", accent: PALETTE.steppe, group: "Words & Letters", isNew: true },
  { slug: "sozdik-match", title: "Word Match", kk: "Сөз сәйкестік", en: "English word → tap the Kazakh one", accent: PALETTE.steppe700, group: "Words & Letters" },
  { slug: "memory-match", title: "Memory Match", kk: "Естен қалдырма", en: "Flip cards, pair English + Kazakh", accent: PALETTE.steppe, group: "Words & Letters" },
  { slug: "falling-sozder", title: "Falling Words", kk: "Құлайтын сөздер", en: "Catch each word in the right basket", accent: PALETTE.steppe700, group: "Words & Letters" },
  // Places & Culture
  { slug: "where-kz", title: "Where in Kazakhstan?", kk: "Қайда?", en: "See a photo → find the place on the map", accent: PALETTE.terra, group: "Places & Culture", isNew: true },
  { slug: "bazaar", title: "Steppe Bazaar", kk: "Базар", en: "Shop for food, count your teńge", accent: PALETTE.terra, group: "Places & Culture", isNew: true },
  // Get Up & Move (in-room)
  { slug: "snow-leopard", title: "Snow Leopard Patrol", kk: "Қар барысы", en: "Scan QR clues hidden around the room", accent: PALETTE.wolf, group: "Get Up & Move" },
  { slug: "jaryq-hunter", title: "Flashlight Words", kk: "Жарық", en: "Shine a light to reveal hidden words", accent: PALETTE.ink, group: "Get Up & Move" },
  // Make Your Own
  { slug: "tanba-studio", title: "Design Your Avatar", kk: "Сурет салу", en: "Draw or import art → it becomes you", accent: PALETTE.gold, group: "Make Your Own" },
  { slug: "story-maker", title: "Story Maker", kk: "Әңгіме", en: "Turn your drawings into a comic", accent: PALETTE.steppe, group: "Make Your Own" },
];

const GROUPS_V2 = [
  { key: "Words & Letters", kk: "Сөздер мен әріптер", color: PALETTE.steppe, blurb: "The Kazakh alphabet, sounds & vocabulary" },
  { key: "Places & Culture", kk: "Жерлер", color: PALETTE.terra, blurb: "Know your country, food & cities" },
  { key: "Get Up & Move", kk: "Қозғал", color: PALETTE.steppe700, blurb: "Out of your seat, around the room" },
  { key: "Make Your Own", kk: "Жаса", color: PALETTE.gold, blurb: "Draw, build & tell your story" },
];

Object.assign(window, { REVISED_GAMES, GROUPS_V2 });
