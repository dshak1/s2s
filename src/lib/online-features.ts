// Multiplayer/session features — the facilitator console, joining a live
// session, and the Say & Shift race — are gated separately from the rest of
// the app for the initial public deploy. The single-player games are ready;
// this isn't, and it needs real workshop testing first. Flip
// NEXT_PUBLIC_ONLINE_FEATURES=1 in the deployment's env vars once it is —
// no code change needed to turn it back on.
export const ONLINE_FEATURES_ENABLED = process.env.NEXT_PUBLIC_ONLINE_FEATURES === "1";

// The /play/create builder's output wasn't ready to publish either (rough
// generated game), unrelated to the online-features gate above — this one's
// a straight code flip when the builder's actually been redesigned, not an
// env var, since there's no "enable it for staff only" use case for it.
export const GAME_BUILDER_ENABLED = false;
