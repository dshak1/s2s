"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { SteppeSprint } from "@/components/game/steppe-sprint";
import { gameTemplateById } from "@/content/game-templates";
import { VOCAB } from "@/content/vocab";
import { ComingSoon } from "@/components/coming-soon";
import { GAME_BUILDER_ENABLED } from "@/lib/online-features";
import { useProfile } from "@/lib/store";

export default function CustomGamePage() {
  if (!GAME_BUILDER_ENABLED) {
    return <ComingSoon title="Build a game" detail="The game builder is getting a redesign. Check back soon." />;
  }
  return <CustomGame />;
}

function CustomGame() {
  const params = useParams<{ id: string }>();
  const profile = useProfile();
  const game = profile.customGames.find((item) => item.id === params.id);

  if (!game) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#eef7ff] p-4 text-center">
        <div>
          <h1 className="text-2xl font-black text-steppe">Game not found</h1>
          <Link href="/play/create" className="mt-3 inline-block font-black text-steppe underline">Build a new game</Link>
        </div>
      </main>
    );
  }

  const vocab = game.vocabSlugs.flatMap((slug) => {
    const item = VOCAB.find((candidate) => candidate.slug === slug);
    return item ? [item] : [];
  });
  const artifact = profile.artifacts.find((item) => item.id === game.backgroundArtifactId);
  const template = gameTemplateById(game.backgroundTemplateId);

  return (
    <SteppeSprint
      title={game.title}
      runKey={`custom:${game.id}`}
      vocab={vocab}
      backgroundUrl={artifact?.dataUrl ?? template?.image}
    />
  );
}
