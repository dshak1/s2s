import type { LearnerState } from "@/lib/learner-state";
import { dueForReview, shouldReviewConcept } from "@/lib/learner-state";

export type QuizQuestion = {
  id: string;
  conceptId: string;
  topic: "vocabulary" | "grammar" | "cases" | "possessives" | "family" | "conversation" | "transliteration" | "culture";
  difficulty: number;
  prompt: string;
  options: string[];
  answer: string;
  explanation: string;
  wrongExplanations: Record<string, string>;
  note?: string;
};

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "home-dative",
    conceptId: "case.dative",
    topic: "cases",
    difficulty: 1,
    prompt: "What does “Мен үйге барамын” mean?",
    options: ["I am going home.", "I am at home.", "I am coming from home.", "This is my house."],
    answer: "I am going home.",
    explanation: "үй means house/home. The ending -ге marks the dative case, which commonly shows movement toward something. барамын means I go / I am going.",
    wrongExplanations: {
      "I am at home.": "Being at home would normally use the locative: үйде, not үйге.",
      "I am coming from home.": "Movement from home would use the ablative: үйден, not үйге.",
      "This is my house.": "That would need a possessive form such as менің үйім; барамын is a verb meaning I go.",
    },
    note: "Dative: -ға/-ге/-қа/-ке = toward/to.",
  },
  {
    id: "school-locative",
    conceptId: "case.locative",
    topic: "cases",
    difficulty: 2,
    prompt: "Which sentence means “I am at school”?",
    options: ["Мен мектептемін.", "Мен мектепке барамын.", "Мен мектептен келемін.", "Менің мектебім."],
    answer: "Мен мектептемін.",
    explanation: "мектепте uses the locative ending -те, meaning in/at the school. -мін marks first-person ‘I am’ here.",
    wrongExplanations: {
      "Мен мектепке барамын.": "мектепке is dative, so this means I am going to school.",
      "Мен мектептен келемін.": "мектептен is ablative, so this means I come from school.",
      "Менің мектебім.": "This is a possessive phrase: my school.",
    },
  },
  {
    id: "city-ablative",
    conceptId: "case.ablative",
    topic: "cases",
    difficulty: 2,
    prompt: "What does “Мен Алматыдан келдім” mean?",
    options: ["I came from Almaty.", "I am going to Almaty.", "I live in Almaty.", "I like Almaty."],
    answer: "I came from Almaty.",
    explanation: "Алматыдан has the ablative ending -дан, which marks movement from a place. келдім means I came.",
    wrongExplanations: {
      "I am going to Almaty.": "Going to Almaty would use the dative: Алматыға.",
      "I live in Almaty.": "Location in Almaty would use the locative: Алматыда.",
      "I like Almaty.": "There is no verb for ‘like’ in this sentence.",
    },
  },
  {
    id: "my-mother",
    conceptId: "possessive.first-person",
    topic: "possessives",
    difficulty: 1,
    prompt: "Which phrase means “my mother”?",
    options: ["менің анам", "сенің анаң", "оның анасы", "біздің анамыз"],
    answer: "менің анам",
    explanation: "менің means my, and анам is ана with the first-person possessive ending -м.",
    wrongExplanations: {
      "сенің анаң": "This means your mother (informal singular).",
      "оның анасы": "This means his/her mother.",
      "біздің анамыз": "This means our mother.",
    },
  },
  {
    id: "your-father",
    conceptId: "possessive.second-person",
    topic: "possessives",
    difficulty: 2,
    prompt: "Which phrase means “your father” when speaking informally to one person?",
    options: ["сенің әкең", "менің әкем", "оның әкесі", "сіздің әкеңіз"],
    answer: "сенің әкең",
    explanation: "сенің is informal singular ‘your’, and әкең carries the matching second-person possessive ending -ң.",
    wrongExplanations: {
      "менің әкем": "This means my father.",
      "оның әкесі": "This means his/her father.",
      "сіздің әкеңіз": "This is the polite/formal form of your father.",
    },
  },
  {
    id: "older-brother",
    conceptId: "family.siblings",
    topic: "family",
    difficulty: 1,
    prompt: "What does “аға” usually mean?",
    options: ["older brother / older male relative", "younger sister", "grandmother", "daughter"],
    answer: "older brother / older male relative",
    explanation: "аға refers to an older brother and can also be used respectfully for an older male relative or man.",
    wrongExplanations: {
      "younger sister": "A younger sibling is usually іні for a younger brother or қарындас/сіңлі depending on speaker and relation.",
      grandmother: "Grandmother is әже.",
      daughter: "Daughter is қыз.",
    },
  },
  {
    id: "grandmother",
    conceptId: "family.core",
    topic: "family",
    difficulty: 1,
    prompt: "Which Kazakh word means “grandmother”?",
    options: ["әже", "ата", "ана", "әпке"],
    answer: "әже",
    explanation: "әже means grandmother. It is one of the most common core family words.",
    wrongExplanations: {
      ата: "ата means grandfather / elder male ancestor.",
      ана: "ана means mother.",
      әпке: "әпке means older sister.",
    },
  },
  {
    id: "hello-informal",
    conceptId: "conversation.greetings",
    topic: "conversation",
    difficulty: 1,
    prompt: "Which greeting is the most natural informal “Hi”?",
    options: ["Сәлем!", "Сау болыңыз!", "Рақмет!", "Кешіріңіз!"],
    answer: "Сәлем!",
    explanation: "Сәлем! is the everyday informal greeting ‘Hi/Hello.’",
    wrongExplanations: {
      "Сау болыңыз!": "This is a polite goodbye.",
      "Рақмет!": "This means thank you.",
      "Кешіріңіз!": "This means excuse me / sorry.",
    },
  },
  {
    id: "how-are-you",
    conceptId: "conversation.greetings",
    topic: "conversation",
    difficulty: 2,
    prompt: "What does “Қалың қалай?” mean?",
    options: ["How are you?", "What is your name?", "Where are you going?", "How old are you?"],
    answer: "How are you?",
    explanation: "Қалың қалай? is a common informal way to ask how someone is doing.",
    wrongExplanations: {
      "What is your name?": "That would be Атың кім? informally.",
      "Where are you going?": "That would use қайда and a verb of movement.",
      "How old are you?": "That is Жасың нешеде? informally.",
    },
  },
  {
    id: "raqmet",
    conceptId: "vocab.courtesy",
    topic: "vocabulary",
    difficulty: 1,
    prompt: "What does “рақмет” mean?",
    options: ["thank you", "please", "hello", "good night"],
    answer: "thank you",
    explanation: "рақмет is the everyday Kazakh word for ‘thank you.’",
    wrongExplanations: {
      please: "‘Please’ is often өтінемін in requests.",
      hello: "Hello is сәлем or сәлеметсіз бе depending on formality.",
      "good night": "Good night is қайырлы түн.",
    },
  },
  {
    id: "water",
    conceptId: "vocab.basic-nouns",
    topic: "vocabulary",
    difficulty: 1,
    prompt: "Which word means “water”?",
    options: ["су", "нан", "сүт", "шай"],
    answer: "су",
    explanation: "су means water.",
    wrongExplanations: {
      нан: "нан means bread.",
      сүт: "сүт means milk.",
      шай: "шай means tea.",
    },
  },
  {
    id: "plural-vowel-harmony",
    conceptId: "grammar.plural",
    topic: "grammar",
    difficulty: 3,
    prompt: "Which is the correct plural of “кітап” (book)?",
    options: ["кітаптар", "кітаплер", "кітапдер", "кітапке"],
    answer: "кітаптар",
    explanation: "The plural suffix harmonizes and also changes its initial consonant after the final sound of the stem. кітап takes -тар: кітаптар.",
    wrongExplanations: {
      кітаплер: "-лер does not match the back-vowel harmony of кітап.",
      кітапдер: "The consonant form is wrong after the final п.",
      кітапке: "-ке is a dative case ending, not a plural ending.",
    },
  },
  {
    id: "men-pronoun",
    conceptId: "grammar.pronouns",
    topic: "grammar",
    difficulty: 1,
    prompt: "What does the pronoun “мен” mean?",
    options: ["I", "you", "we", "they"],
    answer: "I",
    explanation: "мен is the first-person singular pronoun ‘I.’",
    wrongExplanations: {
      you: "Informal singular you is сен.",
      we: "We is біз.",
      they: "They is олар.",
    },
  },
  {
    id: "latin-qazaq",
    conceptId: "transliteration.basic",
    topic: "transliteration",
    difficulty: 2,
    prompt: "Which Cyrillic word matches the transliteration “qazaq”?",
    options: ["қазақ", "қала", "қымыз", "қалам"],
    answer: "қазақ",
    explanation: "qazaq maps to қазақ: q represents the Kazakh қ sound in common Latin transliteration systems.",
    wrongExplanations: {
      қала: "қала means city and would transliterate roughly as qala.",
      қымыз: "қымыз is qymyz.",
      қалам: "қалам is qalam.",
    },
  },
  {
    id: "uly-kyzy",
    conceptId: "culture.patronymics",
    topic: "culture",
    difficulty: 2,
    prompt: "In traditional Kazakh naming, what do “ұлы” and “қызы” literally indicate?",
    options: ["son of / daughter of", "older / younger", "city / village", "teacher / student"],
    answer: "son of / daughter of",
    explanation: "ұлы means ‘son of’ in a patronymic construction, while қызы means ‘daughter of.’",
    wrongExplanations: {
      "older / younger": "Those words are not age-ranking labels in patronymics.",
      "city / village": "They are kinship words, not place words.",
      "teacher / student": "They do not describe occupations or school roles.",
    },
  },
  {
    id: "turkic-family",
    conceptId: "culture.turkic-languages",
    topic: "culture",
    difficulty: 3,
    prompt: "Kazakh belongs to which language family?",
    options: ["Turkic", "Slavic", "Romance", "Germanic"],
    answer: "Turkic",
    explanation: "Kazakh is a Turkic language, specifically part of the Kipchak branch.",
    wrongExplanations: {
      Slavic: "Russian is Slavic, but Kazakh is not.",
      Romance: "Romance languages descend from Latin; Kazakh does not.",
      Germanic: "English is Germanic; Kazakh is Turkic.",
    },
  },
  {
    id: "baramyn-person",
    conceptId: "grammar.present-personal-ending",
    topic: "grammar",
    difficulty: 3,
    prompt: "In “барамын”, what does the ending -мын tell you?",
    options: ["the speaker is ‘I’", "the action is past tense", "the noun is plural", "the action is negative"],
    answer: "the speaker is ‘I’",
    explanation: "In this form, -мын marks first-person singular agreement: барамын = I go / I am going.",
    wrongExplanations: {
      "the action is past tense": "Past tense uses other markers, such as -ды/-ді in forms like бардым.",
      "the noun is plural": "This is a verb ending, not a noun plural suffix.",
      "the action is negative": "Negative forms use markers such as -ма/-ме before personal endings.",
    },
  },
  {
    id: "negative-go",
    conceptId: "grammar.negation",
    topic: "grammar",
    difficulty: 4,
    prompt: "Which sentence means “I am not going”?",
    options: ["Мен бармаймын.", "Мен барамын.", "Мен бардым.", "Мен баруға."],
    answer: "Мен бармаймын.",
    explanation: "бармаймын contains the negative marker -ма/-ме (surfacing here as -май) plus the first-person ending: I do not go / I am not going.",
    wrongExplanations: {
      "Мен барамын.": "This is affirmative: I go / I am going.",
      "Мен бардым.": "This is past tense: I went.",
      "Мен баруға.": "This is not a complete finite sentence meaning I am not going.",
    },
  },
];

function scoreQuestion(question: QuizQuestion, learner: LearnerState, reviewOnly: boolean) {
  const concept = learner.concepts[question.conceptId];
  const due = dueForReview(learner).includes(question.conceptId);
  let score = 0;
  if (!concept) score += 4;
  else {
    score += (1 - concept.mastery) * 8;
    if (due) score += 6;
    if (concept.mastery >= 0.85 && !due) score -= 8;
  }
  score -= Math.abs(question.difficulty - learner.difficulty) * 1.4;
  if (learner.interests.includes(question.topic)) score += 2;
  if (reviewOnly && concept?.attempts && concept.mastery < 0.8) score += 8;
  if (reviewOnly && (!concept || concept.attempts === 0)) score -= 5;
  if (!shouldReviewConcept(learner, question.conceptId) && !due) score -= 4;
  return score;
}

export function selectQuizQuestions(learner: LearnerState, count = 5, reviewOnly = false): QuizQuestion[] {
  const ranked = QUIZ_QUESTIONS
    .map((question) => ({ question, score: scoreQuestion(question, learner, reviewOnly) + Math.random() * 1.5 }))
    .sort((a, b) => b.score - a.score);

  const picked: QuizQuestion[] = [];
  const conceptCounts = new Map<string, number>();
  for (const row of ranked) {
    if (picked.length >= count) break;
    const countForConcept = conceptCounts.get(row.question.conceptId) ?? 0;
    if (countForConcept >= 1 && picked.length < count - 1) continue;
    picked.push(row.question);
    conceptCounts.set(row.question.conceptId, countForConcept + 1);
  }
  return picked;
}

export function conceptLabel(id: string) {
  const labels: Record<string, string> = {
    "case.dative": "dative case",
    "case.locative": "locative case",
    "case.ablative": "ablative case",
    "possessive.first-person": "first-person possessives",
    "possessive.second-person": "second-person possessives",
    "family.siblings": "family vocabulary",
    "family.core": "family vocabulary",
    "conversation.greetings": "conversation and greetings",
    "vocab.courtesy": "courtesy vocabulary",
    "vocab.basic-nouns": "basic vocabulary",
    "grammar.plural": "plural endings",
    "grammar.pronouns": "pronouns",
    "transliteration.basic": "Cyrillic ↔ Latin transliteration",
    "culture.patronymics": "Kazakh naming culture",
    "culture.turkic-languages": "Turkic language knowledge",
    "grammar.present-personal-ending": "verb person endings",
    "grammar.negation": "verb negation",
  };
  return labels[id] ?? id.replaceAll(".", " ");
}
