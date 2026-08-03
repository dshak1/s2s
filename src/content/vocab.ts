// Real Kazakh vocabulary used as seed data across every game.
// `kk` = Cyrillic (primary), `latin` = Latin script toggle, `en`/`ru` = base
// language gloss (the language a kid reads the prompt in; see baseLanguage
// on the profile and the toggle on /play).
// `slug` matches the SVG placeholder at /public/img/{category}/{slug}.svg

export type VocabCategory =
  | "family"
  | "numbers"
  | "animals"
  | "colors"
  | "places"
  | "food"
  | "greetings"
  | "body"
  | "weather"
  | "school"
  | "nature";

export type VocabItem = {
  slug: string;
  kk: string;
  latin: string;
  en: string;
  ru: string;
  category: VocabCategory;
  /** AI-drafted, not yet checked by a native speaker — see the note above
   * the "weather"/"school"/"nature" blocks below. Never set on the original
   * 72-word set. */
  aiDrafted?: true;
};

export const VOCAB: VocabItem[] = [
  // family — отбасы
  { slug: "ake", kk: "Әке", latin: "Áke", en: "Father", ru: "Отец", category: "family" },
  { slug: "ana", kk: "Ана", latin: "Ana", en: "Mother", ru: "Мать", category: "family" },
  { slug: "ata", kk: "Ата", latin: "Ata", en: "Grandfather", ru: "Дедушка", category: "family" },
  { slug: "azhe", kk: "Әже", latin: "Áje", en: "Grandmother", ru: "Бабушка", category: "family" },
  { slug: "bala", kk: "Бала", latin: "Bala", en: "Child", ru: "Ребёнок", category: "family" },
  { slug: "aga", kk: "Аға", latin: "Aǵa", en: "Older brother", ru: "Старший брат", category: "family" },
  { slug: "apa", kk: "Апа", latin: "Apa", en: "Older sister", ru: "Старшая сестра", category: "family" },
  { slug: "ini", kk: "Іні", latin: "Iní", en: "Younger brother", ru: "Младший брат", category: "family" },
  { slug: "qaryndas", kk: "Қарындас", latin: "Qaryndas", en: "Younger sister", ru: "Младшая сестра", category: "family" },
  { slug: "bauyr", kk: "Бауыр", latin: "Bauyr", en: "Sibling", ru: "Брат/сестра", category: "family" },

  // numbers — сандар
  { slug: "bir", kk: "Бір", latin: "Bir", en: "One", ru: "Один", category: "numbers" },
  { slug: "eki", kk: "Екі", latin: "Eki", en: "Two", ru: "Два", category: "numbers" },
  { slug: "ush", kk: "Үш", latin: "Úsh", en: "Three", ru: "Три", category: "numbers" },
  { slug: "tort", kk: "Төрт", latin: "Tórt", en: "Four", ru: "Четыре", category: "numbers" },
  { slug: "bes", kk: "Бес", latin: "Bes", en: "Five", ru: "Пять", category: "numbers" },
  { slug: "alty", kk: "Алты", latin: "Alty", en: "Six", ru: "Шесть", category: "numbers" },
  { slug: "zheti", kk: "Жеті", latin: "Jeti", en: "Seven", ru: "Семь", category: "numbers" },
  { slug: "segiz", kk: "Сегіз", latin: "Segiz", en: "Eight", ru: "Восемь", category: "numbers" },
  { slug: "togyz", kk: "Тоғыз", latin: "Toǵyz", en: "Nine", ru: "Девять", category: "numbers" },
  { slug: "on", kk: "Он", latin: "On", en: "Ten", ru: "Десять", category: "numbers" },

  // animals — жануарлар
  { slug: "at", kk: "Ат", latin: "At", en: "Horse", ru: "Лошадь", category: "animals" },
  { slug: "qoi", kk: "Қой", latin: "Qoi", en: "Sheep", ru: "Овца", category: "animals" },
  { slug: "tuie", kk: "Түйе", latin: "Túie", en: "Camel", ru: "Верблюд", category: "animals" },
  { slug: "it", kk: "Ит", latin: "It", en: "Dog", ru: "Собака", category: "animals" },
  { slug: "mysyq", kk: "Мысық", latin: "Mysyq", en: "Cat", ru: "Кошка", category: "animals" },
  { slug: "qasqyr", kk: "Қасқыр", latin: "Qasqyr", en: "Wolf", ru: "Волк", category: "animals" },
  { slug: "barys", kk: "Барыс", latin: "Barys", en: "Snow leopard", ru: "Снежный барс", category: "animals" },
  { slug: "burkit", kk: "Бүркіт", latin: "Búrkit", en: "Eagle", ru: "Орёл", category: "animals" },
  { slug: "aiu", kk: "Аю", latin: "Aiu", en: "Bear", ru: "Медведь", category: "animals" },
  { slug: "tulki", kk: "Түлкі", latin: "Túlki", en: "Fox", ru: "Лиса", category: "animals" },

  // colors — түстер
  { slug: "qyzyl", kk: "Қызыл", latin: "Qyzyl", en: "Red", ru: "Красный", category: "colors" },
  { slug: "kok", kk: "Көк", latin: "Kók", en: "Blue", ru: "Синий", category: "colors" },
  { slug: "sary", kk: "Сары", latin: "Sary", en: "Yellow", ru: "Жёлтый", category: "colors" },
  { slug: "zhasyl", kk: "Жасыл", latin: "Jasyl", en: "Green", ru: "Зелёный", category: "colors" },
  { slug: "aq", kk: "Ақ", latin: "Aq", en: "White", ru: "Белый", category: "colors" },
  { slug: "qara", kk: "Қара", latin: "Qara", en: "Black", ru: "Чёрный", category: "colors" },
  { slug: "qongyr", kk: "Қоңыр", latin: "Qońyr", en: "Brown", ru: "Коричневый", category: "colors" },
  { slug: "sur", kk: "Сұр", latin: "Sur", en: "Grey", ru: "Серый", category: "colors" },

  // places — мекендер
  { slug: "ui", kk: "Үй", latin: "Úi", en: "House", ru: "Дом", category: "places" },
  { slug: "qala", kk: "Қала", latin: "Qala", en: "City", ru: "Город", category: "places" },
  { slug: "dala", kk: "Дала", latin: "Dala", en: "Steppe", ru: "Степь", category: "places" },
  { slug: "tau", kk: "Тау", latin: "Tau", en: "Mountain", ru: "Гора", category: "places" },
  { slug: "ozen", kk: "Өзен", latin: "Ózen", en: "River", ru: "Река", category: "places" },
  { slug: "kol", kk: "Көл", latin: "Kól", en: "Lake", ru: "Озеро", category: "places" },
  { slug: "auyl", kk: "Ауыл", latin: "Auyl", en: "Village", ru: "Деревня", category: "places" },
  { slug: "mektep", kk: "Мектеп", latin: "Mektep", en: "School", ru: "Школа", category: "places" },

  // food — тағам
  { slug: "nan", kk: "Нан", latin: "Nan", en: "Bread", ru: "Хлеб", category: "food" },
  { slug: "su", kk: "Су", latin: "Su", en: "Water", ru: "Вода", category: "food" },
  { slug: "sut", kk: "Сүт", latin: "Sút", en: "Milk", ru: "Молоко", category: "food" },
  { slug: "et", kk: "Ет", latin: "Et", en: "Meat", ru: "Мясо", category: "food" },
  { slug: "bauyrsaq", kk: "Бауырсақ", latin: "Bauyrsaq", en: "Bauyrsaq", ru: "Баурсак", category: "food" },
  { slug: "qymyz", kk: "Қымыз", latin: "Qymyz", en: "Kymyz", ru: "Кумыс", category: "food" },
  { slug: "shai", kk: "Шай", latin: "Shai", en: "Tea", ru: "Чай", category: "food" },
  { slug: "alma", kk: "Алма", latin: "Alma", en: "Apple", ru: "Яблоко", category: "food" },
  { slug: "bal", kk: "Бал", latin: "Bal", en: "Honey", ru: "Мёд", category: "food" },

  // greetings — сәлемдесу
  { slug: "salem", kk: "Сәлем", latin: "Sálem", en: "Hi", ru: "Привет", category: "greetings" },
  { slug: "salemetsiz", kk: "Сәлеметсіз бе", latin: "Sálemetsiz be", en: "Hello (formal)", ru: "Здравствуйте", category: "greetings" },
  { slug: "qalaysyn", kk: "Қалайсың", latin: "Qalaisyń", en: "How are you?", ru: "Как дела?", category: "greetings" },
  { slug: "zhaksy", kk: "Жақсы", latin: "Jaqsy", en: "Good / fine", ru: "Хорошо", category: "greetings" },
  { slug: "rahmet", kk: "Рахмет", latin: "Rahmet", en: "Thank you", ru: "Спасибо", category: "greetings" },
  { slug: "sau-bol", kk: "Сау бол", latin: "Sau bol", en: "Goodbye", ru: "До свидания", category: "greetings" },
  { slug: "kesh-zharyq", kk: "Кеш жарық", latin: "Kesh jaryq", en: "Good evening", ru: "Добрый вечер", category: "greetings" },
  { slug: "qairly-tan", kk: "Қайырлы таң", latin: "Qaiyrly tań", en: "Good morning", ru: "Доброе утро", category: "greetings" },

  // body — дене
  { slug: "bas", kk: "Бас", latin: "Bas", en: "Head", ru: "Голова", category: "body" },
  { slug: "qol", kk: "Қол", latin: "Qol", en: "Hand", ru: "Рука", category: "body" },
  { slug: "ayaq", kk: "Аяқ", latin: "Aiaq", en: "Foot", ru: "Нога", category: "body" },
  { slug: "koz", kk: "Көз", latin: "Kóz", en: "Eye", ru: "Глаз", category: "body" },
  { slug: "qulaq", kk: "Құлақ", latin: "Qulaq", en: "Ear", ru: "Ухо", category: "body" },
  { slug: "muryn", kk: "Мұрын", latin: "Muryn", en: "Nose", ru: "Нос", category: "body" },
  { slug: "auyz", kk: "Ауыз", latin: "Auyz", en: "Mouth", ru: "Рот", category: "body" },
  { slug: "shash", kk: "Шаш", latin: "Shash", en: "Hair", ru: "Волосы", category: "body" },
  { slug: "tis", kk: "Тіс", latin: "Tis", en: "Tooth", ru: "Зуб", category: "body" },

  // ---------------------------------------------------------------------
  // AI-drafted, 2026-08-03 — generated to widen vocab coverage, NOT checked
  // by a native speaker yet. Flagged via aiDrafted: true on every entry
  // below. Spot-check before a real workshop leans on these three categories.
  // ---------------------------------------------------------------------

  // weather — ауа-райы
  { slug: "zhanbyr", kk: "Жаңбыр", latin: "Jańbyr", en: "Rain", ru: "Дождь", category: "weather", aiDrafted: true },
  { slug: "qar", kk: "Қар", latin: "Qar", en: "Snow", ru: "Снег", category: "weather", aiDrafted: true },
  { slug: "kun", kk: "Күн", latin: "Kún", en: "Sun", ru: "Солнце", category: "weather", aiDrafted: true },
  { slug: "zhel", kk: "Жел", latin: "Jel", en: "Wind", ru: "Ветер", category: "weather", aiDrafted: true },
  { slug: "bult", kk: "Бұлт", latin: "Bult", en: "Cloud", ru: "Облако", category: "weather", aiDrafted: true },
  { slug: "ystyq", kk: "Ыстық", latin: "Ystyq", en: "Hot", ru: "Жарко", category: "weather", aiDrafted: true },
  { slug: "suyq", kk: "Суық", latin: "Suyq", en: "Cold", ru: "Холодно", category: "weather", aiDrafted: true },

  // school — мектеп
  { slug: "kitap", kk: "Кітап", latin: "Kitap", en: "Book", ru: "Книга", category: "school", aiDrafted: true },
  { slug: "qalam", kk: "Қалам", latin: "Qalam", en: "Pen", ru: "Ручка", category: "school", aiDrafted: true },
  { slug: "qaryndash", kk: "Қарындаш", latin: "Qaryndash", en: "Pencil", ru: "Карандаш", category: "school", aiDrafted: true },
  { slug: "ustel", kk: "Үстел", latin: "Ústel", en: "Table", ru: "Стол", category: "school", aiDrafted: true },
  { slug: "oryndyq", kk: "Орындық", latin: "Oryndyq", en: "Chair", ru: "Стул", category: "school", aiDrafted: true },
  { slug: "mugalim", kk: "Мұғалім", latin: "Muǵalim", en: "Teacher", ru: "Учитель", category: "school", aiDrafted: true },
  { slug: "oqushy", kk: "Оқушы", latin: "Oqushy", en: "Student", ru: "Ученик", category: "school", aiDrafted: true },

  // nature — табиғат
  { slug: "agash", kk: "Ағаш", latin: "Aǵash", en: "Tree", ru: "Дерево", category: "nature", aiDrafted: true },
  { slug: "gul", kk: "Гүл", latin: "Gúl", en: "Flower", ru: "Цветок", category: "nature", aiDrafted: true },
  { slug: "aspan", kk: "Аспан", latin: "Aspan", en: "Sky", ru: "Небо", category: "nature", aiDrafted: true },
  { slug: "zhuldyz", kk: "Жұлдыз", latin: "Juldyz", en: "Star", ru: "Звезда", category: "nature", aiDrafted: true },
  { slug: "ai", kk: "Ай", latin: "Ai", en: "Moon", ru: "Луна", category: "nature", aiDrafted: true },
  { slug: "tas", kk: "Тас", latin: "Tas", en: "Stone", ru: "Камень", category: "nature", aiDrafted: true },
];

export const CATEGORIES: VocabCategory[] = [
  "family", "numbers", "animals", "colors", "places", "food", "greetings", "body",
  "weather", "school", "nature",
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
  weather: "Weather",
  school: "School",
  nature: "Nature",
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
  ru: string;
  emoji: string;
}> = [
  { key: "family", kk: "Отбасы", en: "Family", ru: "Семья", emoji: "👨‍👩‍👧‍👦" },
  { key: "numbers", kk: "Сандар", en: "Numbers", ru: "Числа", emoji: "🔢" },
  { key: "animals", kk: "Жануарлар", en: "Animals", ru: "Животные", emoji: "🐎" },
  { key: "colors", kk: "Түстер", en: "Colors", ru: "Цвета", emoji: "🎨" },
  { key: "food", kk: "Тағам", en: "Food", ru: "Еда", emoji: "🍎" },
  { key: "places", kk: "Жерлер", en: "Places", ru: "Места", emoji: "🏔️" },
  { key: "greetings", kk: "Сәлемдесу", en: "Greetings", ru: "Приветствия", emoji: "👋" },
  { key: "body", kk: "Дене", en: "Body", ru: "Тело", emoji: "🖐️" },
  { key: "weather", kk: "Ауа-райы", en: "Weather", ru: "Погода", emoji: "🌦️" },
  { key: "school", kk: "Мектеп", en: "School", ru: "Школа", emoji: "📚" },
  { key: "nature", kk: "Табиғат", en: "Nature", ru: "Природа", emoji: "🌳" },
];

export function imgFor(item: VocabItem): string {
  return `/img/${item.category}/${item.slug}.svg`;
}

export function vocabBySlug(slug: string): VocabItem | undefined {
  return VOCAB.find((v) => v.slug === slug);
}
