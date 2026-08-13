export type GameMeta = {
  slug: string;
  title: string;
  kk: string;
  blurb: string;
  href: string;
  accent: string; // tailwind bg class for the tile
  group: GameGroup;
  isNew?: boolean;
  // Hidden games stay routable (the "locker") but never render on the hub,
  // profile shelf, or facilitator launcher.
  hidden?: boolean;
};

export type GameGroup =
  | "Words & Letters"
  | "Places & Culture"
  | "Get Up & Move"
  | "Make Your Own";

export const GAME_GROUPS: Array<{
  key: GameGroup;
  kk: string;
  color: string;
  blurb: string;
}> = [
  {
    key: "Words & Letters",
    kk: "Сөздер мен әріптер",
    color: "bg-steppe",
    blurb: "Kazakh sounds, letters, and vocabulary.",
  },
  {
    key: "Places & Culture",
    kk: "Жерлер",
    color: "bg-terra",
    blurb: "Kazakhstan, food, money, and culture.",
  },
  {
    key: "Get Up & Move",
    kk: "Қозғал",
    color: "bg-steppe-700",
    blurb: "Projector and in-room activities.",
  },
  {
    key: "Make Your Own",
    kk: "Жаса",
    color: "bg-gold",
    blurb: "Draw, upload, and tell stories.",
  },
];

export const GAMES: GameMeta[] = [
  { slug: "learn", title: "Learn", kk: "Үйрен", blurb: "Get quizzed on letters and greetings, mixed together as you improve.", href: "/play/learn", accent: "bg-steppe", group: "Words & Letters", isNew: true },
  { slug: "say-and-shift", title: "Nomad Run", kk: "Айт та өт", blurb: "Say the Kazakh word out loud to slip through the wall.", href: "/play/say-and-shift", accent: "bg-[#c8513e]", group: "Make Your Own", isNew: true },
  // Folded into "Learn" — kept routable (old links, telemetry history) but off every launcher.
  { slug: "sound-it-out", title: "Sound It Out", kk: "Дыбыс", blurb: "Hear it, tap the matching Kazakh letter.", href: "/play/sound-it-out", accent: "bg-steppe", group: "Words & Letters", hidden: true },
  { slug: "greetings-quiz", title: "Greetings Quiz", kk: "Сәлемдесу", blurb: "Hear a Kazakh greeting, tap the match.", href: "/play/greetings-quiz", accent: "bg-steppe-700", group: "Words & Letters", hidden: true },
  { slug: "sozdik-match", title: "Word Match", kk: "Сөз сәйкестік", blurb: "English word or picture → Kazakh.", href: "/play/sozdik-match", accent: "bg-steppe-700", group: "Words & Letters", hidden: true },
  { slug: "memory-match", title: "Memory Match", kk: "Естен қалдырма", blurb: "Flip cards, pair English + Kazakh.", href: "/play/memory-match", accent: "bg-steppe", group: "Words & Letters", hidden: true },
  { slug: "falling-sozder", title: "Falling Words", kk: "Құлайтын сөздер", blurb: "Catch each English prompt in the Kazakh basket.", href: "/play/falling-sozder", accent: "bg-steppe-700", group: "Words & Letters" },
  { slug: "where-kz", title: "Where in Kazakhstan?", kk: "Қайда?", blurb: "See a place, drop a pin on the map.", href: "/play/where-kz", accent: "bg-terra", group: "Places & Culture", isNew: true },
  { slug: "bazaar", title: "Steppe Bazaar", kk: "Базар", blurb: "Shop for food and count your teńge.", href: "/play/bazaar", accent: "bg-terra", group: "Places & Culture", hidden: true },
  { slug: "steppe-sprint", title: "Steppe Sprint", kk: "Дала жарысы", blurb: "Run the trail and choose the right word at each fork.", href: "/play/steppe-sprint", accent: "bg-[#2f8d47]", group: "Get Up & Move", hidden: true },
  { slug: "snow-leopard", title: "Snow Leopard Patrol", kk: "Қар барысы", blurb: "Scan QR clues hidden around the room.", href: "/play/snow-leopard", accent: "bg-wolf", group: "Get Up & Move", hidden: true },
  { slug: "jaryq-hunter", title: "Spotlight Rush", kk: "Жарық", blurb: "Hunt words in the dark, dodge the ghosts!", href: "/play/jaryq-hunter", accent: "bg-[#1b1b1b]", group: "Get Up & Move", isNew: true },
  // tanba-studio is not a game — it stays reachable from the profile gallery.
  { slug: "tanba-studio", title: "Design Your Avatar", kk: "Сурет салу", blurb: "Draw or import art to become your avatar.", href: "/play/tanba-studio", accent: "bg-gold", group: "Make Your Own", hidden: true },
  { slug: "story-maker", title: "Story Maker", kk: "Әңгіме", blurb: "Build a comic with your art.", href: "/play/story-maker", accent: "bg-steppe", group: "Make Your Own", hidden: true },
];

// Games that actually show up on the hub, profile shelf, and facilitator launcher.
export const VISIBLE_GAMES = GAMES.filter((game) => !game.hidden);

// TODO: Re-enable Aitys Battle only after the couplets are replaced with real rhyming Kazakh lines.
// Dala Quest is now represented by the Silk Road progression layer on the games hub.
