"use client";

import { SteppeSprint } from "@/components/game/steppe-sprint";
import { VOCAB } from "@/content/vocab";

const SPRINT_VOCAB = VOCAB.filter((item) => ["animals", "food", "places"].includes(item.category)).slice(0, 18);

export default function SteppeSprintPage() {
  return <SteppeSprint title="Steppe Sprint" runKey="steppe-sprint" vocab={SPRINT_VOCAB} />;
}
