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
  {
    id: "katonkaragay",
    name: "Katon-Karagay",
    kk: "Катонқарағай",
    x: 935,
    y: 240,
    hue: "#2f6b45",
    sky: ["#cfe6f5", "#eaf6e6"],
    fact: "Katon-Karagay is Kazakhstan's largest national park, high in the Altai mountains where bears, deer and golden eagles live. Beekeepers here make the country's most famous honey.",
  },
  {
    id: "pavlodar",
    name: "Pavlodar",
    kk: "Павлодар",
    x: 734,
    y: 136,
    hue: "#6f9f7a",
    sky: ["#d8ecf8", "#f2f7e6"],
    fact: "Pavlodar sits on the wide Irtysh river in the north. Kids swim in it all summer and skate on top of it once it freezes.",
  },
  {
    id: "kaindy",
    name: "Lake Kaindy",
    kk: "Қайыңды көлі",
    x: 769,
    y: 446,
    hue: "#2f8f8a",
    sky: ["#cfe8f2", "#e9f4ea"],
    fact: "An earthquake flooded a valley here and the spruce forest stayed standing underwater. The bare treetops still poke out of the turquoise lake. Its Kazakh name, Қайыңды, means 'birchy'.",
  },
  {
    id: "shymbulak",
    name: "Shymbulak",
    kk: "Шымбұлақ",
    x: 736,
    y: 441,
    hue: "#dfe9f2",
    sky: ["#bcdcf2", "#f0f6fb"],
    fact: "Shymbulak is a ski slope in the mountains right above Almaty. You ride a cable car up and the whole city looks tiny below you.",
  },
];

// Photos. The team supplied the first four; the rest come from Wikimedia
// Commons. Four of those are CC BY-SA, which requires the credit to be visible,
// so `credit` is rendered on the image rather than buried in a file nobody opens.
// Full licence details are in docs/photo-credits.md.
//
// A place with no entry here still plays — it falls back to the gradient
// silhouette below and shows a "No photo yet" badge. That is deliberate: a
// place kids asked for should be in the game the same week they asked, not
// blocked behind a photo hunt.
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
  katonkaragay: {
    src: "/img/places-photos/katonkaragay.jpg",
    credit: "Seitov Sultanbai, CC BY 4.0",
  },
  pavlodar: { src: "/img/places-photos/pavlodar.jpg", credit: "Zac Allan, public domain" },
  kaindy: { src: "/img/places-photos/kaindy.jpg", credit: "Katariyakartikey, CC0" },
  shymbulak: {
    src: "/img/places-photos/shymbulak.jpg",
    credit: "Matti Blume, CC BY-SA 4.0",
  },
};

export function placeCloseness(pin: { x: number; y: number }, place: Place): number {
  const distance = Math.hypot(pin.x - place.x, pin.y - place.y);
  return Math.max(0, Math.round(100 - distance / 4.5));
}
