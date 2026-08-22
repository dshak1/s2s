import type { VocabItem, VocabCategory } from "@/content/vocab";
import { VOCAB } from "@/content/vocab";

// The word lists from the workshops as they were actually run.
//
// Deliberately not derived from anything: a workshop is a session that
// happened on a date, and its words are what got written on the board that
// day. The journey stops in src/content/journey.ts are a separate idea — the
// sessions have not tracked them city by city — so nothing here is keyed to a
// region or a vocabulary category. One entry per workshop, in the groups the
// terms were taught in.
//
// Terms are either a `ref` to a word already in VOCAB — so a kid's mastery of
// it counts once, wherever they met it — or written out in full here, for the
// ones the workshop introduced that the app did not already know.

/** A word already in VOCAB, named by slug. */
export type WorkshopTermRef = { ref: string };
export type WorkshopTerm = WorkshopTermRef | VocabItem;

export type WorkshopGroup = {
  /** The heading it was taught under. A landmark, a city, or just the
   *  associations exercise itself. */
  label: string;
  kk?: string;
  terms: WorkshopTerm[];
};

export type WorkshopSet = {
  /** Stable id, used for telemetry and for remembering a kid's last pick. */
  id: string;
  /** Counts up in the order they were run: this is "Workshop 1". */
  number: number;
  /** ISO date it was run, shown to the kid as "22 August". */
  date: string;
  title: string;
  groups: WorkshopGroup[];
};

/**
 * `category` on the written-out terms below is nominal — nearest existing
 * bucket, picked so the shape matches VocabItem. These entries never join
 * VOCAB, so nothing filters or packs by it; a workshop's own grouping is the
 * one that means anything here.
 *
 * Kazakh and English are as the workshop taught them. The Latin spellings and
 * the Russian glosses are drafted, not checked by a native speaker — hence
 * aiDrafted, same rule as the weather/school/nature block in vocab.ts.
 */
function term(
  slug: string,
  kk: string,
  latin: string,
  en: string,
  ru: string,
  category: VocabCategory,
): VocabItem {
  return { slug, kk, latin, en, ru, category, aiDrafted: true };
}

export const WORKSHOP_SETS: WorkshopSet[] = [
  {
    id: "2026-08-22",
    number: 1,
    date: "2026-08-22",
    title: "Cities of Kazakhstan",
    groups: [
      {
        label: "Almaty",
        kk: "Алматы",
        terms: [
          { ref: "tau" },
          { ref: "alma" },
          term("tabigat", "Табиғат", "Tabiǵat", "Nature", "Природа", "nature"),
          term("koktobe", "Көктөбе", "Kóktóbe", "Kok Tobe", "Кок-Тобе", "places"),
        ],
      },
      {
        label: "Astana",
        kk: "Астана",
        terms: [
          term("baiterek", "Бәйтерек", "Báiterek", "Baiterek", "Байтерек", "places"),
          term("zamanaui-qala", "Заманауи қала", "Zamanaui qala", "Modern city", "Современный город", "places"),
          term("suyq-qys", "Суық қыс", "Suyq qys", "Cold winter", "Холодная зима", "weather"),
          term("biik-gimarat", "Биік ғимарат", "Biik ǵimarat", "Tall building", "Высокое здание", "places"),
        ],
      },
      {
        label: "Mausoleum of Khoja Ahmed Yasawi",
        kk: "Қожа Ахмет Ясауи кесенесі",
        terms: [
          term("tarih", "Тарих", "Tarih", "History", "История", "school"),
          term("kone-qala", "Көне қала", "Kóne qala", "Ancient city", "Древний город", "places"),
          term("madeniet", "Мәдениет", "Mádeniet", "Culture", "Культура", "school"),
          term("kesene", "Кесене", "Kesene", "Mausoleum", "Мавзолей", "places"),
        ],
      },
      {
        label: "Karaganda",
        kk: "Қарағанды",
        terms: [
          term("ken", "Кен", "Ken", "Ore", "Руда", "nature"),
          term("ondiris", "Өндіріс", "Óndiris", "Industry", "Промышленность", "places"),
          term("universitet", "Университет", "Universitet", "University", "Университет", "school"),
          term("ulken-qala", "Үлкен қала", "Úlken qala", "Big city", "Большой город", "places"),
          term("zhumys", "Жұмыс", "Jumys", "Work", "Работа", "school"),
        ],
      },
      {
        label: "The Ural river",
        kk: "Жайық",
        terms: [
          term("zhaiyq", "Жайық", "Jaiyq", "Ural River", "Урал (река)", "places"),
          term("munai", "Мұнай", "Munai", "Oil", "Нефть", "nature"),
          term("kopir", "Көпір", "Kópir", "Bridge", "Мост", "places"),
          term("balyq", "Балық", "Balyq", "Fish", "Рыба", "animals"),
          { ref: "ozen" },
        ],
      },
      {
        // The city this one belongs to was not on the sheet it came from.
        label: "Associations",
        kk: "Ассоциациялар",
        terms: [
          term("zhyly", "Жылы", "Jyly", "Warm", "Тёплый", "weather"),
          { ref: "zhasyl" },
          { ref: "gul" },
          { ref: "kun" },
        ],
      },
    ],
  },
];

export function workshopSetById(id: string): WorkshopSet | undefined {
  return WORKSHOP_SETS.find((set) => set.id === id);
}

/** Resolve a group's terms against the live vocabulary (which includes any
 *  custom pack a facilitator has added). A ref whose word has since been
 *  removed simply drops out rather than breaking the list. */
export function resolveTerms(terms: WorkshopTerm[], vocab: VocabItem[] = VOCAB): VocabItem[] {
  return terms
    .map((entry) => ("ref" in entry ? vocab.find((item) => item.slug === entry.ref) : entry))
    .filter((item): item is VocabItem => Boolean(item));
}

export function workshopSetTerms(set: WorkshopSet, vocab: VocabItem[] = VOCAB): VocabItem[] {
  return set.groups.flatMap((group) => resolveTerms(group.terms, vocab));
}

/** "22 August" — the workshop's own date, for the review sheet. */
export function workshopDateLabel(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}
