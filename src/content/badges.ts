export type BadgeId =
  | "aul_member"
  | "first_match"
  | "tanba_artist"
  | "explorer"
  | "memory_master"
  | "word_catcher"
  | "first_yurt"
  | "snow_tracker"
  | "storyteller";

export type Badge = {
  id: BadgeId;
  name: string;
  kk: string;
  symbol: string; // unicode glyph for the badge case
  hint: string; // shown while locked
};

export const BADGES: Badge[] = [
  { id: "aul_member", name: "Aul Member", kk: "Ауыл мүшесі", symbol: "★", hint: "Join your first workshop session." },
  { id: "first_match", name: "Word Pairer", kk: "Сөз сәйкес", symbol: "✦", hint: "Finish a round of Sözdik Match." },
  { id: "tanba_artist", name: "Tańba Artist", kk: "Таңба суретші", symbol: "✸", hint: "Draw and save your own tańba." },
  { id: "explorer", name: "Steppe Explorer", kk: "Дала зерттеуші", symbol: "✷", hint: "Unlock a new region in Dala Quest." },
  { id: "memory_master", name: "Memory Master", kk: "Жад шебері", symbol: "❂", hint: "Clear a board in Esten Qaldyrma." },
  { id: "word_catcher", name: "Word Catcher", kk: "Сөз аулаушы", symbol: "✺", hint: "Catch 8 words in Falling Sözder." },
  { id: "first_yurt", name: "Yurt Builder", kk: "Үй құрушы", symbol: "⌂", hint: "Master all 36 Kazakh letters." },
  { id: "snow_tracker", name: "Snow Tracker", kk: "Із кесуші", symbol: "❄", hint: "Collect all 8 snow-leopard clues in one session." },
  { id: "storyteller", name: "Storyteller", kk: "Әңгімеші", symbol: "✶", hint: "Make a 3-panel comic in Story Maker." },
];

export function badgeById(id: BadgeId): Badge | undefined {
  return BADGES.find((b) => b.id === id);
}
