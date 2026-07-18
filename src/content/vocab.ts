// Real Kazakh vocabulary used as seed data across every game.
// `kk` = Cyrillic (primary), `latin` = Latin script toggle, `en` = English gloss.
// `slug` matches the SVG placeholder at /public/img/{category}/{slug}.svg

export type VocabCategory =
  | "family"
  | "numbers"
  | "animals"
  | "colors"
  | "places"
  | "food"
  | "greetings"
  | "body";

export type VocabItem = {
  slug: string;
  kk: string;
  latin: string;
  en: string;
  category: VocabCategory;
};

export const VOCAB: VocabItem[] = [
  // family — отбасы
  { slug: "ake", kk: "Әке", latin: "Áke", en: "Father", category: "family" },
  { slug: "ana", kk: "Ана", latin: "Ana", en: "Mother", category: "family" },
  { slug: "ata", kk: "Ата", latin: "Ata", en: "Grandfather", category: "family" },
  { slug: "azhe", kk: "Әже", latin: "Áje", en: "Grandmother", category: "family" },
  { slug: "bala", kk: "Бала", latin: "Bala", en: "Child", category: "family" },
  { slug: "aga", kk: "Аға", latin: "Aǵa", en: "Older brother", category: "family" },
  { slug: "apa", kk: "Апа", latin: "Apa", en: "Older sister", category: "family" },
  { slug: "ini", kk: "Іні", latin: "Iní", en: "Younger brother", category: "family" },
  { slug: "qaryndas", kk: "Қарындас", latin: "Qaryndas", en: "Younger sister", category: "family" },
  { slug: "bauyr", kk: "Бауыр", latin: "Bauyr", en: "Sibling", category: "family" },

  // numbers — сандар
  { slug: "bir", kk: "Бір", latin: "Bir", en: "One", category: "numbers" },
  { slug: "eki", kk: "Екі", latin: "Eki", en: "Two", category: "numbers" },
  { slug: "ush", kk: "Үш", latin: "Úsh", en: "Three", category: "numbers" },
  { slug: "tort", kk: "Төрт", latin: "Tórt", en: "Four", category: "numbers" },
  { slug: "bes", kk: "Бес", latin: "Bes", en: "Five", category: "numbers" },
  { slug: "alty", kk: "Алты", latin: "Alty", en: "Six", category: "numbers" },
  { slug: "zheti", kk: "Жеті", latin: "Jeti", en: "Seven", category: "numbers" },
  { slug: "segiz", kk: "Сегіз", latin: "Segiz", en: "Eight", category: "numbers" },
  { slug: "togyz", kk: "Тоғыз", latin: "Toǵyz", en: "Nine", category: "numbers" },
  { slug: "on", kk: "Он", latin: "On", en: "Ten", category: "numbers" },

  // animals — жануарлар
  { slug: "at", kk: "Ат", latin: "At", en: "Horse", category: "animals" },
  { slug: "qoi", kk: "Қой", latin: "Qoi", en: "Sheep", category: "animals" },
  { slug: "tuie", kk: "Түйе", latin: "Túie", en: "Camel", category: "animals" },
  { slug: "it", kk: "Ит", latin: "It", en: "Dog", category: "animals" },
  { slug: "mysyq", kk: "Мысық", latin: "Mysyq", en: "Cat", category: "animals" },
  { slug: "qasqyr", kk: "Қасқыр", latin: "Qasqyr", en: "Wolf", category: "animals" },
  { slug: "barys", kk: "Барыс", latin: "Barys", en: "Snow leopard", category: "animals" },
  { slug: "burkit", kk: "Бүркіт", latin: "Búrkit", en: "Eagle", category: "animals" },
  { slug: "aiu", kk: "Аю", latin: "Aiu", en: "Bear", category: "animals" },
  { slug: "tulki", kk: "Түлкі", latin: "Túlki", en: "Fox", category: "animals" },

  // colors — түстер
  { slug: "qyzyl", kk: "Қызыл", latin: "Qyzyl", en: "Red", category: "colors" },
  { slug: "kok", kk: "Көк", latin: "Kók", en: "Blue", category: "colors" },
  { slug: "sary", kk: "Сары", latin: "Sary", en: "Yellow", category: "colors" },
  { slug: "zhasyl", kk: "Жасыл", latin: "Jasyl", en: "Green", category: "colors" },
  { slug: "aq", kk: "Ақ", latin: "Aq", en: "White", category: "colors" },
  { slug: "qara", kk: "Қара", latin: "Qara", en: "Black", category: "colors" },
  { slug: "qongyr", kk: "Қоңыр", latin: "Qońyr", en: "Brown", category: "colors" },
  { slug: "sur", kk: "Сұр", latin: "Sur", en: "Grey", category: "colors" },

  // places — мекендер
  { slug: "ui", kk: "Үй", latin: "Úi", en: "House", category: "places" },
  { slug: "qala", kk: "Қала", latin: "Qala", en: "City", category: "places" },
  { slug: "dala", kk: "Дала", latin: "Dala", en: "Steppe", category: "places" },
  { slug: "tau", kk: "Тау", latin: "Tau", en: "Mountain", category: "places" },
  { slug: "ozen", kk: "Өзен", latin: "Ózen", en: "River", category: "places" },
  { slug: "kol", kk: "Көл", latin: "Kól", en: "Lake", category: "places" },
  { slug: "auyl", kk: "Ауыл", latin: "Auyl", en: "Village", category: "places" },
  { slug: "mektep", kk: "Мектеп", latin: "Mektep", en: "School", category: "places" },

  // food — тағам
  { slug: "nan", kk: "Нан", latin: "Nan", en: "Bread", category: "food" },
  { slug: "su", kk: "Су", latin: "Su", en: "Water", category: "food" },
  { slug: "sut", kk: "Сүт", latin: "Sút", en: "Milk", category: "food" },
  { slug: "et", kk: "Ет", latin: "Et", en: "Meat", category: "food" },
  { slug: "bauyrsaq", kk: "Бауырсақ", latin: "Bauyrsaq", en: "Bauyrsaq", category: "food" },
  { slug: "qymyz", kk: "Қымыз", latin: "Qymyz", en: "Kymyz", category: "food" },
  { slug: "shai", kk: "Шай", latin: "Shai", en: "Tea", category: "food" },
  { slug: "alma", kk: "Алма", latin: "Alma", en: "Apple", category: "food" },
  { slug: "bal", kk: "Бал", latin: "Bal", en: "Honey", category: "food" },

  // greetings — сәлемдесу
  { slug: "salem", kk: "Сәлем", latin: "Sálem", en: "Hi", category: "greetings" },
  { slug: "salemetsiz", kk: "Сәлеметсіз бе", latin: "Sálemetsiz be", en: "Hello (formal)", category: "greetings" },
  { slug: "qalaysyn", kk: "Қалайсың", latin: "Qalaisyń", en: "How are you?", category: "greetings" },
  { slug: "zhaksy", kk: "Жақсы", latin: "Jaqsy", en: "Good / fine", category: "greetings" },
  { slug: "rahmet", kk: "Рахмет", latin: "Rahmet", en: "Thank you", category: "greetings" },
  { slug: "sau-bol", kk: "Сау бол", latin: "Sau bol", en: "Goodbye", category: "greetings" },
  { slug: "kesh-zharyq", kk: "Кеш жарық", latin: "Kesh jaryq", en: "Good evening", category: "greetings" },
  { slug: "qairly-tan", kk: "Қайырлы таң", latin: "Qaiyrly tań", en: "Good morning", category: "greetings" },

  // body — дене
  { slug: "bas", kk: "Бас", latin: "Bas", en: "Head", category: "body" },
  { slug: "qol", kk: "Қол", latin: "Qol", en: "Hand", category: "body" },
  { slug: "ayaq", kk: "Аяқ", latin: "Aiaq", en: "Foot", category: "body" },
  { slug: "koz", kk: "Көз", latin: "Kóz", en: "Eye", category: "body" },
  { slug: "qulaq", kk: "Құлақ", latin: "Qulaq", en: "Ear", category: "body" },
  { slug: "muryn", kk: "Мұрын", latin: "Muryn", en: "Nose", category: "body" },
  { slug: "auyz", kk: "Ауыз", latin: "Auyz", en: "Mouth", category: "body" },
  { slug: "shash", kk: "Шаш", latin: "Shash", en: "Hair", category: "body" },
  { slug: "tis", kk: "Тіс", latin: "Tis", en: "Tooth", category: "body" },
];

export const CATEGORIES: VocabCategory[] = [
  "family", "numbers", "animals", "colors", "places", "food", "greetings", "body",
];

export const CATEGORY_LABELS: Record<VocabCategory, string> = {
  family: "Family",
  numbers: "Numbers",
  animals: "Animals",
  colors: "Colors",
  places: "Places",
  food: "Food",
  greetings: "Greetings",
  body: "Body",
};

export function vocabByCategory(cat: VocabCategory): VocabItem[] {
  return VOCAB.filter((v) => v.category === cat);
}

// Shared pack-select metadata for the vocab category games
// (Falling Words, Spotlight Panic).
export const VOCAB_CATEGORY_META: Array<{
  key: VocabCategory;
  kk: string;
  en: string;
  emoji: string;
}> = [
  { key: "family", kk: "Отбасы", en: "Family", emoji: "👨‍👩‍👧‍👦" },
  { key: "numbers", kk: "Сандар", en: "Numbers", emoji: "🔢" },
  { key: "animals", kk: "Жануарлар", en: "Animals", emoji: "🐎" },
  { key: "colors", kk: "Түстер", en: "Colors", emoji: "🎨" },
  { key: "food", kk: "Тағам", en: "Food", emoji: "🍎" },
  { key: "places", kk: "Жерлер", en: "Places", emoji: "🏔️" },
  { key: "greetings", kk: "Сәлемдесу", en: "Greetings", emoji: "👋" },
  { key: "body", kk: "Дене", en: "Body", emoji: "🖐️" },
];

export function imgFor(item: VocabItem): string {
  return `/img/${item.category}/${item.slug}.svg`;
}

export function vocabBySlug(slug: string): VocabItem | undefined {
  return VOCAB.find((v) => v.slug === slug);
}
