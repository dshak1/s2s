// Kazakh greetings + courtesy phrases for the Greetings Quiz (audio-first).
// `audio` points at /public/audio/greetings/<file>.mp3. Until real recordings are
// uploaded the game falls back to a synthesized cue via playClip().
export type Greeting = {
  kk: string;
  en: string;
  ru: string;
  latin: string;
  audio: string;
};

export const GREETINGS: Greeting[] = [
  { kk: "Сәлем", en: "Hi (informal)", ru: "Привет", latin: "Sálem", audio: "/audio/greetings/salem.mp3" },
  { kk: "Сәлеметсіз бе", en: "Hello (formal)", ru: "Здравствуйте", latin: "Sálemetsiz be", audio: "/audio/greetings/salemetsiz-be.mp3" },
  { kk: "Қайырлы таң", en: "Good morning", ru: "Доброе утро", latin: "Qaiyrly tań", audio: "/audio/greetings/qairly-tan.mp3" },
  { kk: "Қайырлы күн", en: "Good afternoon", ru: "Добрый день", latin: "Qaiyrly kún", audio: "/audio/greetings/qairly-kun.mp3" },
  { kk: "Қайырлы кеш", en: "Good evening", ru: "Добрый вечер", latin: "Qaiyrly kesh", audio: "/audio/greetings/qairly-kesh.mp3" },
  { kk: "Қалайсың?", en: "How are you?", ru: "Как дела?", latin: "Qalaisyń?", audio: "/audio/greetings/qalaisyn.mp3" },
  { kk: "Жақсымын", en: "I'm good", ru: "Хорошо", latin: "Jaqsymyn", audio: "/audio/greetings/jaqsymyn.mp3" },
  { kk: "Рахмет", en: "Thank you", ru: "Спасибо", latin: "Rakhmet", audio: "/audio/greetings/rakhmet.mp3" },
  { kk: "Кешіріңіз", en: "Excuse me / Sorry", ru: "Извините", latin: "Keshirińiz", audio: "/audio/greetings/keshiriniz.mp3" },
  { kk: "Сау болыңыз", en: "Goodbye", ru: "До свидания", latin: "Sau bolyńyz", audio: "/audio/greetings/sau-bolynyz.mp3" },
];
