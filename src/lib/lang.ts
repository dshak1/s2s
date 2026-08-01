// The language a kid reads prompts in. Kazakh (`kk`) is always the thing
// being taught; this only picks which language explains it. See
// Profile.baseLanguage in store.ts and the toggle on /play.
export type BaseLanguage = "en" | "ru";

export function baseText(item: { en: string; ru: string }, lang: BaseLanguage): string {
  return lang === "ru" ? item.ru : item.en;
}
