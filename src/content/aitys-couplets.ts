// Aitys is real Kazakh oral poetry — improvised, sung, rhyming duels.
// These are simple, hand-written kid-friendly couplets with one or two blanks.
// `answers` are the correct fill words; `decoys` round out the tile shelf.

export type Couplet = {
  id: string;
  // lines, where "___" marks a blank in order
  lines: string[];
  answers: string[]; // in blank order
  decoys: string[];
  translation: string;
};

export const COUPLETS: Couplet[] = [
  {
    id: "steppe-wind",
    lines: ["Далада соғады ___,", "Жүрегімде менің ___."],
    answers: ["жел", "ән"],
    decoys: ["тау", "су", "нан", "ат"],
    translation: "The wind blows across the steppe, / and a song lives in my heart.",
  },
  {
    id: "horse-friend",
    lines: ["Менің досым, жүйрік ___,", "Бірге шабамыз біз ___."],
    answers: ["ат", "тауға"],
    decoys: ["ит", "үйге", "көл", "нан"],
    translation: "My friend is a swift horse, / together we gallop to the mountain.",
  },
  {
    id: "warm-home",
    lines: ["Шаңырақта жанады ___,", "Анам пісірген дәмді ___."],
    answers: ["от", "нан"],
    decoys: ["су", "тас", "жел", "ай"],
    translation: "A fire burns under the shanyrak, / and Mother has baked tasty bread.",
  },
  {
    id: "snow-leopard",
    lines: ["Тауда жортады ___,", "Қарда қалдырар ___."],
    answers: ["барыс", "із"],
    decoys: ["қой", "гүл", "бал", "көл"],
    translation: "The snow leopard roams the mountains, / leaving its tracks in the snow.",
  },
  {
    id: "eagle-sky",
    lines: ["Аспанда қалықтар ___,", "Жерден көреді ол ___."],
    answers: ["бүркіт", "бәрін"],
    decoys: ["балық", "түйе", "сүт", "тіс"],
    translation: "The eagle soars in the sky, / and from there it sees everything.",
  },
];
