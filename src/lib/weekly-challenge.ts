import { VISIBLE_GAMES } from "@/content/games";

// ISO week number (1-53), stable across timezones since it's computed off
// UTC — every kid sees the same challenge on the same calendar week
// regardless of device clock/timezone.
function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

/** No storage, no server round trip: every client derives the same slug from
 * the same week number, so the challenge just rotates itself every Monday. */
export function weeklyChallengeSlug(now: Date = new Date()): string {
  const week = isoWeek(now) + now.getUTCFullYear() * 53;
  return VISIBLE_GAMES[week % VISIBLE_GAMES.length].slug;
}

export const WEEKLY_XP_MULTIPLIER = 2;
