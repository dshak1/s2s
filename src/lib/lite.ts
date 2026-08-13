// "Lite" deployment mode. When NEXT_PUBLIC_LITE=1 the app exposes only the
// focus game (Learn — letters + greetings quizzing) and hides the rest of
// the hub, journey, session, and facilitator surfaces. The full site is
// unaffected when the flag is unset. The value is inlined at build time, so
// it is constant per deployment and safe to branch on before hooks.
export const IS_LITE = process.env.NEXT_PUBLIC_LITE === "1";

export const LITE_GAME_SLUGS = ["learn"] as const;
