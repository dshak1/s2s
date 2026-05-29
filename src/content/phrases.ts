// Curated Kazakh phrases for the Story Maker comic builder.
export type Phrase = { kk: string; en: string };

export const PHRASES: Phrase[] = [
  { kk: "Сәлем!", en: "Hi!" },
  { kk: "Қалайсың?", en: "How are you?" },
  { kk: "Жақсы!", en: "I'm good!" },
  { kk: "Менің атым ...", en: "My name is ..." },
  { kk: "Бұл — ...", en: "This is ..." },
  { kk: "Мен ...мын", en: "I am ..." },
  { kk: "Рахмет!", en: "Thank you!" },
  { kk: "Сау бол!", en: "Goodbye!" },
  { kk: "Керемет!", en: "Awesome!" },
  { kk: "Көрейік!", en: "Let's see!" },
];

// Snow Leopard Patrol — nature-vocab clue questions (8 stops).
export type Clue = {
  id: string;
  prompt: string;
  imageSlug: string; // reuse animal/place SVGs
  imageCategory: string;
  options: string[];
  answer: string;
};

export const CLUES: Clue[] = [
  { id: "barys", prompt: "Which animal is the qar barysy (snow leopard)?", imageCategory: "animals", imageSlug: "barys", options: ["Барыс", "Ит", "Қой"], answer: "Барыс" },
  { id: "burkit", prompt: "What soars high in the sky?", imageCategory: "animals", imageSlug: "burkit", options: ["Бүркіт", "Балық", "Түйе"], answer: "Бүркіт" },
  { id: "tau", prompt: "Where does the snow leopard live?", imageCategory: "places", imageSlug: "tau", options: ["Тау", "Қала", "Көл"], answer: "Тау" },
  { id: "qasqyr", prompt: "Which animal howls at the moon?", imageCategory: "animals", imageSlug: "qasqyr", options: ["Қасқыр", "Мысық", "Аю"], answer: "Қасқыр" },
  { id: "ozen", prompt: "What flows down from the mountains?", imageCategory: "places", imageSlug: "ozen", options: ["Өзен", "Дала", "Үй"], answer: "Өзен" },
  { id: "aiu", prompt: "Who sleeps all winter in a cave?", imageCategory: "animals", imageSlug: "aiu", options: ["Аю", "Ат", "Қой"], answer: "Аю" },
  { id: "tulki", prompt: "Which clever animal has a red tail?", imageCategory: "animals", imageSlug: "tulki", options: ["Түлкі", "Түйе", "Ит"], answer: "Түлкі" },
  { id: "kol", prompt: "Where do the eagles drink water?", imageCategory: "places", imageSlug: "kol", options: ["Көл", "Тау", "Қала"], answer: "Көл" },
];
