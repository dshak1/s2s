// Cyrillic letter -> generated pronunciation clip. Lives in /content (not
// /lib/audio.ts) so build scripts can import it without resolving the "@/"
// path alias — scripts/gen-items.mjs reads it to fill each letter item's
// payload.

export const LETTER_AUDIO_SRC: Record<string, string> = {
  А: "/audio/letters/a.mp3",
  Ә: "/audio/letters/ae.mp3",
  Б: "/audio/letters/b.mp3",
  В: "/audio/letters/v.mp3",
  Г: "/audio/letters/g.mp3",
  Ғ: "/audio/letters/gh.mp3",
  Д: "/audio/letters/d.mp3",
  Е: "/audio/letters/e.mp3",
  Ж: "/audio/letters/zh.mp3",
  З: "/audio/letters/z.mp3",
  И: "/audio/letters/i-cyr.mp3",
  І: "/audio/letters/i-kaz.mp3",
  К: "/audio/letters/k.mp3",
  Қ: "/audio/letters/q.mp3",
  Л: "/audio/letters/l.mp3",
  М: "/audio/letters/m.mp3",
  Н: "/audio/letters/n.mp3",
  Ң: "/audio/letters/ng.mp3",
  О: "/audio/letters/o.mp3",
  Ө: "/audio/letters/oe.mp3",
  П: "/audio/letters/p.mp3",
  Р: "/audio/letters/r.mp3",
  С: "/audio/letters/s.mp3",
  Т: "/audio/letters/t.mp3",
  У: "/audio/letters/u-cyr.mp3",
  Ұ: "/audio/letters/u-short.mp3",
  Ү: "/audio/letters/u-front.mp3",
  Ф: "/audio/letters/f.mp3",
  Х: "/audio/letters/h-hard.mp3",
  Һ: "/audio/letters/h-breathy.mp3",
  Ч: "/audio/letters/ch.mp3",
  Ш: "/audio/letters/sh.mp3",
  Щ: "/audio/letters/shch.mp3",
  Ы: "/audio/letters/y.mp3",
  Ю: "/audio/letters/yu.mp3",
  Я: "/audio/letters/ya.mp3",
};

// The nine letters Kazakh has that Russian does not — the core learning goal of
// Sound It Out, and the ones worth prioritising in every alphabet drill.
export const KAZAKH_ONLY_LETTERS = ["Ә", "Ғ", "Қ", "Ң", "Ө", "Ұ", "Ү", "Һ", "І"];
