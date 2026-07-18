// Start screens designed by workshop kids in Canva. Each cover is a full-bleed
// image with the kid's own drawn button mapped to a clickable hotspot.
// Hotspot coords are percentages of the image box; `hotspot: null` means the
// whole cover is tappable (the kid didn't draw a button).

export type KidCover = {
  id: string;
  artist: string | null; // null until we confirm the kid's name
  image: string;
  alt: string;
  // % of image box: left/top of the button's top-left corner, then width/height.
  hotspot: { left: number; top: number; width: number; height: number } | null;
};

export const KID_COVERS: KidCover[] = [
  {
    id: "medina",
    artist: "Medina",
    image: "/kid-covers/cover-1.jpg",
    alt: "Green steppe with a cat saying Let's learn Kazakh together and a START button",
    hotspot: { left: 35, top: 70, width: 36, height: 22 },
  },
  {
    id: "batyr-horse",
    artist: null,
    image: "/kid-covers/cover-2.jpg",
    alt: "A batyr hero, a horse, and beshbarmak — Let's learn Kazakh together",
    hotspot: null,
  },
  {
    id: "yum",
    artist: null,
    image: "/kid-covers/cover-3.jpg",
    alt: "Mountain meadow with horses and a baby saying yum, PLAY button",
    hotspot: { left: 1, top: 75, width: 19, height: 14 },
  },
  {
    id: "kettik",
    artist: null,
    image: "/kid-covers/cover-4.jpg",
    alt: "Illustrated meadow, cat saying Kettik, Oinau button",
    hotspot: { left: 5, top: 48, width: 28, height: 15 },
  },
  {
    id: "leopard-cub",
    artist: null,
    image: "/kid-covers/cover-5.jpg",
    alt: "Leopard cub saying Let's play, Start button",
    hotspot: { left: 3, top: 40, width: 29, height: 17 },
  },
  {
    id: "carrot-bunny",
    artist: null,
    image: "/kid-covers/cover-6.jpg",
    alt: "Bunny asking for a carrot in a sunny meadow, play button",
    hotspot: { left: 5, top: 51, width: 32, height: 22 },
  },
  {
    id: "salem-bro",
    artist: null,
    image: "/kid-covers/cover-7.jpg",
    alt: "Forest photo with a leopard saying salem bro, START button",
    hotspot: { left: 8, top: 48, width: 23, height: 15 },
  },
];
