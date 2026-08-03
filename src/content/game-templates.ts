export type GameTemplate = {
  id: string;
  name: string;
  image: string;
  tone: string;
};

export const GAME_TEMPLATES: GameTemplate[] = [
  { id: "charyn", name: "Charyn Canyon", image: "/img/places-photos/charyn.jpg", tone: "#df6f43" },
  { id: "astana", name: "Astana Lights", image: "/img/places-photos/astana.webp", tone: "#4f8be8" },
  { id: "almaty", name: "Almaty Mountains", image: "/img/places-photos/almaty.webp", tone: "#3d9a62" },
  { id: "mangystau", name: "Mangystau", image: "/img/places-photos/mangystau.jpg", tone: "#d8a642" },
  { id: "turkistan", name: "Turkistan", image: "/img/places-photos/turkistan.jpg", tone: "#b45466" },
];

export function gameTemplateById(id: string | null | undefined): GameTemplate | undefined {
  return GAME_TEMPLATES.find((template) => template.id === id);
}
