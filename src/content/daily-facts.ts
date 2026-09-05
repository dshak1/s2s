import type { LearnerState } from "@/lib/learner-state";

export type DailyFact = {
  slug: string;
  title: string;
  teaser: string;
  detail: string;
  topics: string[];
  relatedConcepts: string[];
};

export const DAILY_FACTS: DailyFact[] = [
  { slug: "raqmet-rahmat", title: "A word that travelled", teaser: "Kazakh «рақмет» and Uzbek «rahmat» share the same Arabic root.", detail: "Across Central Asia, forms of this word entered several languages through long histories of scholarship, trade and cultural contact. The modern spellings and sounds differ, but the family resemblance is easy to hear.", topics: ["etymology", "turkic-comparison", "vocabulary"], relatedConcepts: ["vocab.courtesy", "culture.turkic-languages"] },
  { slug: "uly-kyzy", title: "Son of, daughter of", teaser: "Traditional Kazakh patronymics can use «ұлы» for “son of” and «қызы» for “daughter of.”", detail: "These are ordinary kinship words used inside a naming tradition. Spotting them helps learners recognize family relationships even before they know the rest of a full name.", topics: ["family", "culture", "names"], relatedConcepts: ["culture.patronymics", "family.core"] },
  { slug: "three-directions", title: "One noun, three directions", teaser: "үйге, үйде, үйден differ by only an ending, but they mean toward home, at home and from home.", detail: "Kazakh case endings carry information English often expresses with separate prepositions. Dative -ге points toward, locative -де places something at/in, and ablative -ден points away from a source.", topics: ["grammar", "cases"], relatedConcepts: ["case.dative", "case.locative", "case.ablative"] },
  { slug: "kipchak-family", title: "Kazakh has close linguistic cousins", teaser: "Kazakh is a Turkic language in the Kipchak branch, alongside languages such as Kyrgyz and Karakalpak.", detail: "Related languages can share vocabulary and grammatical patterns without being mutually identical. Comparing them can be useful, but each language keeps its own sound system, forms and usage.", topics: ["turkic-comparison", "language"], relatedConcepts: ["culture.turkic-languages"] },
  { slug: "vowel-harmony", title: "Endings listen to the word", teaser: "Many Kazakh suffixes change shape to harmonize with the vowels and final sound of the word before them.", detail: "That is why a single grammatical idea can appear with several surface forms. Learners do not need to memorize every ending as an unrelated item; the forms follow recurring sound patterns.", topics: ["grammar", "pronunciation"], relatedConcepts: ["grammar.plural"] },
  { slug: "sen-siz", title: "Two ways to say “you”", teaser: "Kazakh distinguishes informal «сен» from polite or formal «сіз».", detail: "The choice affects more than the pronoun: possessive and verb endings also agree with the form you choose, so politeness is visible in the grammar of the whole phrase.", topics: ["conversation", "possessives", "culture"], relatedConcepts: ["possessive.second-person", "conversation.greetings"] },
  { slug: "q-sound", title: "Қ is not just K", teaser: "The Kazakh letter «қ» represents a sound farther back in the mouth than «к».", detail: "Latin transliterations often write this sound as q, which is why қазақ is commonly rendered as qazaq. Hearing the contrast helps with both spelling and pronunciation.", topics: ["pronunciation", "transliteration"], relatedConcepts: ["transliteration.basic"] },
];

export function selectDailyFact(learner: LearnerState, date = new Date()): DailyFact {
  const weak = new Set(
    Object.entries(learner.concepts)
      .filter(([, value]) => value.attempts > 0)
      .sort((a, b) => a[1].mastery - b[1].mastery)
      .slice(0, 4)
      .map(([id]) => id),
  );
  const personalized = DAILY_FACTS.filter((fact) => fact.relatedConcepts.some((id) => weak.has(id)));
  const interested = DAILY_FACTS.filter((fact) => fact.topics.some((topic) => learner.interests.includes(topic)));
  const pool = personalized.length ? personalized : interested.length ? interested : DAILY_FACTS;
  const dayKey = Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86_400_000);
  return pool[Math.abs(dayKey) % pool.length] ?? DAILY_FACTS[0];
}

export function getDailyFact(slug: string) {
  return DAILY_FACTS.find((fact) => fact.slug === slug);
}
