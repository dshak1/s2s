export type GameMeta = {
  slug: string;
  title: string;
  kk: string;
  blurb: string;
  href: string;
  accent: string; // tailwind bg class for the tile
};

export const GAMES: GameMeta[] = [
  { slug: "sozdik-match", title: "Sözdik Match", kk: "Сөздік сәйкестік", blurb: "Drag words to their pictures.", href: "/play/sozdik-match", accent: "bg-steppe" },
  { slug: "tanba-studio", title: "Tańba Studio", kk: "Таңба студиясы", blurb: "Draw your own tribal mark.", href: "/play/tanba-studio", accent: "bg-terra" },
  { slug: "dala-quest", title: "Dala Quest", kk: "Дала квесі", blurb: "Explore the steppe map.", href: "/quest", accent: "bg-steppe-700" },
  { slug: "jaryq-hunter", title: "Jaryq Hunter", kk: "Жарық аңшысы", blurb: "Find words in the dark.", href: "/play/jaryq-hunter", accent: "bg-[#1b1b1b]" },
  { slug: "memory-match", title: "Esten Qaldyrma", kk: "Естен қалдырма", blurb: "Flip cards, find pairs.", href: "/play/memory-match", accent: "bg-steppe" },
  { slug: "aitys", title: "Aitys Battle", kk: "Айтыс", blurb: "Fill the rhyming couplet.", href: "/play/aitys", accent: "bg-terra" },
  { slug: "falling-sozder", title: "Falling Sözder", kk: "Құлайтын сөздер", blurb: "Catch falling words.", href: "/play/falling-sozder", accent: "bg-steppe-700" },
  { slug: "yurt-builder", title: "Yurt Builder", kk: "Үй құрушы", blurb: "Master letters, build a yurt.", href: "/play/yurt-builder", accent: "bg-gold" },
  { slug: "snow-leopard", title: "Snow Leopard Patrol", kk: "Қар барысы", blurb: "Scan QR clues, collect paws.", href: "/play/snow-leopard", accent: "bg-wolf" },
  { slug: "story-maker", title: "Story Maker", kk: "Әңгіме жасаушы", blurb: "Build a comic with your art.", href: "/play/story-maker", accent: "bg-steppe" },
];
