// Generates a consistent, intentional-looking SVG placeholder for every vocab
// item, plus a wall-map outline. Named so the team can swap in real art later.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

// Re-declare vocab here (plain data) to avoid TS import in a plain node script.
const { VOCAB } = await import("../src/content/vocab.ts").catch(() => ({}));

// Fallback: parse not available in node for .ts, so we inline a tiny loader.
import { readFileSync } from "node:fs";
const src = readFileSync(new URL("../src/content/vocab.ts", import.meta.url), "utf8");
const items = [...src.matchAll(/\{\s*slug:\s*"([^"]+)",\s*kk:\s*"([^"]+)",\s*latin:\s*"([^"]+)",\s*en:\s*"([^"]+)",\s*category:\s*"([^"]+)"\s*\}/g)]
  .map((m) => ({ slug: m[1], kk: m[2], latin: m[3], en: m[4], category: m[5] }));

const BLUE = "#1E4D8C";
const GOLD = "#FFD700";
const CREAM = "#FAF6E9";

// A simple per-category emblem path (kid-friendly, single line weight).
const EMBLEM = {
  family: `<circle cx="100" cy="78" r="20"/><path d="M70 140 q30 -40 60 0" fill="none"/>`,
  numbers: `<path d="M85 55 l15 -10 v70" fill="none"/>`,
  animals: `<path d="M70 120 q10 -45 30 -45 q20 0 30 45" fill="none"/><circle cx="88" cy="80" r="4"/><circle cx="112" cy="80" r="4"/>`,
  colors: `<circle cx="100" cy="90" r="34" fill="none"/><path d="M100 56 v68 M66 90 h68" fill="none"/>`,
  places: `<path d="M60 120 l40 -45 l40 45 z" fill="none"/>`,
  food: `<circle cx="100" cy="92" r="30" fill="none"/><path d="M100 62 v60" fill="none"/>`,
  greetings: `<path d="M70 100 q30 35 60 0" fill="none"/><circle cx="84" cy="78" r="4"/><circle cx="116" cy="78" r="4"/>`,
  body: `<circle cx="100" cy="70" r="16" fill="none"/><path d="M100 86 v34 M80 100 h40" fill="none"/>`,
};

function svgFor(item) {
  const emblem = EMBLEM[item.category] || "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" role="img" aria-label="${item.en}">
  <rect width="200" height="200" rx="24" fill="${BLUE}"/>
  <rect x="8" y="8" width="184" height="184" rx="20" fill="none" stroke="${GOLD}" stroke-width="3" stroke-dasharray="2 10" stroke-linecap="round"/>
  <g stroke="${GOLD}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="${GOLD}">
    ${emblem}
  </g>
  <text x="100" y="168" text-anchor="middle" font-family="Nunito, sans-serif" font-weight="800" font-size="26" fill="${CREAM}">${item.kk}</text>
</svg>\n`;
}

let count = 0;
for (const item of items) {
  const out = join(process.cwd(), "public", "img", item.category, `${item.slug}.svg`);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, svgFor(item));
  count++;
}

// Empty Kazakhstan wall-map outline (printable, reusable across weeks).
const wallMap = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 600">
  <rect width="1000" height="600" fill="${CREAM}"/>
  <path d="M120 360 Q90 300 160 280 Q200 200 320 220 Q420 150 540 200 Q640 150 760 210 Q900 200 900 300 Q920 380 820 400 Q760 470 620 450 Q520 520 400 480 Q260 500 200 440 Q140 420 120 360 Z"
    fill="none" stroke="${BLUE}" stroke-width="5" stroke-linejoin="round"/>
  <text x="500" y="560" text-anchor="middle" font-family="Nunito, sans-serif" font-weight="800" font-size="34" fill="${BLUE}">Snow Leopard Patrol — Wall Map</text>
</svg>\n`;
const wm = join(process.cwd(), "public", "img", "wall-map.svg");
mkdirSync(dirname(wm), { recursive: true });
writeFileSync(wm, wallMap);

console.log(`Generated ${count} vocab SVGs + wall map.`);
