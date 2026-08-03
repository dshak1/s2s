// Places for Where in Kazakhstan — shared between the solo game
// (src/app/play/where-kz) and the facilitator-led live round
// (src/components/live-round-overlay.tsx, src/app/facilitator/[code]/live),
// so the two never drift apart on coordinates or photos.

import { REGIONS } from "@/content/regions";

export type Place = {
  id: string;
  name: string;
  kk: string;
  x: number;
  y: number;
  fact: string;
  hue: string;
  sky: [string, string];
};

export const PLACES: Place[] = [
  ...REGIONS.map((region) => ({
    ...region,
    hue: region.id === "charyn" ? "#c8102e" : region.id === "mangystau" ? "#cdb98e" : "#3f7d4f",
    sky: ["#dcecf6", "#f6efd8"] as [string, string],
  })),
  {
    id: "burabay",
    name: "Burabay",
    kk: "Бурабай",
    x: 578,
    y: 109,
    hue: "#3f7d4f",
    sky: ["#bfe0f2", "#eaf6e0"],
    fact: "Burabay is known for pine forests, blue lakes, and the Okzhetpes rock.",
  },
  {
    id: "aktau",
    name: "Aktau",
    kk: "Ақтау",
    x: 133,
    y: 423,
    hue: "#d6c39b",
    sky: ["#dbeef6", "#f7efd8"],
    fact: "Aktau sits by the Caspian Sea. Its name means white mountain.",
  },
];

// Photos. The team supplied the first four; the rest come from Wikimedia
// Commons. Four of those are CC BY-SA, which requires the credit to be visible,
// so `credit` is rendered on the image rather than buried in a file nobody opens.
// Full licence details are in docs/photo-credits.md.
export type Photo = { src: string; credit?: string };

export const PHOTOS: Record<string, Photo> = {
  almaty: { src: "/img/places-photos/almaty.webp" },
  astana: { src: "/img/places-photos/astana.webp" },
  charyn: { src: "/img/places-photos/charyn.jpg" },
  mangystau: { src: "/img/places-photos/mangystau.jpg" },
  aral: { src: "/img/places-photos/aral.jpg", credit: "Staecker, public domain" },
  karaganda: {
    src: "/img/places-photos/karaganda.jpg",
    credit: "Grin1372Go, CC BY-SA 3.0",
  },
  shymkent: { src: "/img/places-photos/shymkent.jpg", credit: "Hokkey, CC0" },
  turkistan: {
    src: "/img/places-photos/turkistan.jpg",
    credit: "Petar Milosevic, CC BY-SA 3.0",
  },
  burabay: { src: "/img/places-photos/burabay.jpg", credit: "Dots foto, CC BY-SA 4.0" },
  aktau: { src: "/img/places-photos/aktau.jpg", credit: "Vita86, CC BY-SA 3.0" },
};

export function placeCloseness(pin: { x: number; y: number }, place: Place): number {
  const distance = Math.hypot(pin.x - place.x, pin.y - place.y);
  return Math.max(0, Math.round(100 - distance / 4.5));
}
