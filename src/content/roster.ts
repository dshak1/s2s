// The workshop roster: kids we already know are coming, so signing in on a new
// device is recognition instead of recall.
//
// This is deliberately a curated list rather than "every display_name on the
// server". A directory of every kid's name would be an account-enumeration
// surface, and these are children — a roster the team maintains keeps the
// picker useful without turning it into a lookup of everyone who ever played.
//
// Names only. No ids, no emails, nothing that identifies a kid beyond the first
// name they already answer to out loud in the room.
//
// Ordering here does not matter; the picker sorts and filters.
export const WORKSHOP_ROSTER: readonly string[] = [
  "Medina",
  "Alima",
  "Sanzhar",
  "Alan",
  "Kamila",
  "Ayanat",
  "Aimira",
  "Kevin",
  "Sean",
];

// Case- and accent-insensitive, so "alima", "ALIMA" and "Alima" all match, and
// a kid typing on a phone keyboard that auto-capitalises is not punished.
function fold(value: string): string {
  return value.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/**
 * Filter the roster as a kid types.
 *
 * Prefix wins outright: typing "A" shows Aimira, Alan, Alima and Ayanat, and
 * "Al" narrows to Alan and Alima. Substring matches are only used when nothing
 * starts with what was typed — otherwise a single letter drags in every name
 * that merely contains it (typing "a" would list Kamila, Medina, Sanzhar and
 * Sean too), which is noise exactly when the list should be shortest. Falling
 * back rather than mixing keeps the common case clean while still rescuing a
 * kid who starts typing from the middle of their name.
 */
export function matchRoster(query: string, roster: readonly string[] = WORKSHOP_ROSTER): string[] {
  const q = fold(query);
  const byName = (a: string, b: string) => a.localeCompare(b);
  if (!q) return [...roster].sort(byName);

  const prefix: string[] = [];
  const contains: string[] = [];
  for (const name of roster) {
    const folded = fold(name);
    if (folded.startsWith(q)) prefix.push(name);
    else if (folded.includes(q)) contains.push(name);
  }
  return (prefix.length > 0 ? prefix : contains).sort(byName);
}
