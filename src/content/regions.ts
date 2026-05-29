import type { VocabCategory } from "./vocab";

export type RegionId =
  | "almaty"
  | "astana"
  | "aral"
  | "charyn"
  | "mangystau"
  | "karaganda"
  | "shymkent"
  | "turkistan";

export type Region = {
  id: RegionId;
  name: string;
  kk: string;
  category: VocabCategory;
  // rough centroid on a 1000x600 stylized SVG map of Kazakhstan
  x: number;
  y: number;
  fact: string;
};

// Clean lookup so a facilitator could reassign category <-> region later.
export const REGIONS: Region[] = [
  {
    id: "almaty",
    name: "Almaty",
    kk: "Алматы",
    category: "family",
    x: 760,
    y: 430,
    fact: "Almaty sits at the foot of the snowy Alatau mountains and was Kazakhstan's first capital. Its name comes from 'alma' — apple. Wild apples first grew here!",
  },
  {
    id: "astana",
    name: "Astana",
    kk: "Астана",
    category: "numbers",
    x: 540,
    y: 250,
    fact: "Astana is the capital city. The word 'astana' literally means 'capital'. It is one of the coldest capital cities on Earth.",
  },
  {
    id: "aral",
    name: "Aral",
    kk: "Арал",
    category: "animals",
    x: 250,
    y: 320,
    fact: "The Aral Sea was once one of the largest lakes in the world. Today people work hard to bring its water and animals back.",
  },
  {
    id: "charyn",
    name: "Charyn",
    kk: "Шарын",
    category: "colors",
    x: 820,
    y: 400,
    fact: "Charyn Canyon glows red, orange and gold at sunset — a perfect place to learn colours. It is sometimes called the little brother of the Grand Canyon.",
  },
  {
    id: "mangystau",
    name: "Mangystau",
    kk: "Маңғыстау",
    category: "places",
    x: 120,
    y: 420,
    fact: "Mangystau on the Caspian Sea has chalk-white cliffs, deserts and underground mosques carved from stone.",
  },
  {
    id: "karaganda",
    name: "Karaganda",
    kk: "Қарағанды",
    category: "food",
    x: 500,
    y: 360,
    fact: "Karaganda sits in the heart of the steppe. Shepherds here share bauyrsaq and qymyz with every guest who passes.",
  },
  {
    id: "shymkent",
    name: "Shymkent",
    kk: "Шымкент",
    category: "greetings",
    x: 420,
    y: 480,
    fact: "Shymkent is a warm southern city famous for its friendly bazaars where everyone greets each other: Sálemetsiz be!",
  },
  {
    id: "turkistan",
    name: "Türkistan",
    kk: "Түркістан",
    category: "body",
    x: 360,
    y: 450,
    fact: "Türkistan holds the great Mausoleum of Khoja Ahmed Yasawi, with one of the largest brick domes in Central Asia.",
  },
];

export function regionById(id: string): Region | undefined {
  return REGIONS.find((r) => r.id === id);
}
