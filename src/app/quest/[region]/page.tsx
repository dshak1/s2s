"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { TopNav } from "@/components/top-nav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { REGIONS, regionById } from "@/content/regions";
import { CATEGORY_LABELS, vocabByCategory, imgFor } from "@/content/vocab";
import { store, useProfile } from "@/lib/store";
import { baseText } from "@/lib/lang";

export default function RegionPage() {
  const params = useParams<{ region: string }>();
  const region = regionById(params.region);
  const p = useProfile();

  if (!region) {
    return (
      <div className="min-h-dvh bg-warm">
        <TopNav />
        <main className="mx-auto max-w-3xl px-4 py-10 text-center">
          <p className="text-wolf">Region not found.</p>
          <Link href="/quest" className="font-bold text-steppe underline">Back to the map</Link>
        </main>
      </div>
    );
  }

  const vocab = vocabByCategory(region.category);
  const idx = REGIONS.findIndex((r) => r.id === region.id);
  const next = REGIONS[idx + 1];
  const nextUnlocked = next ? p.regionProgress.includes(next.id) : true;

  return (
    <div className="min-h-dvh bg-warm">
      <TopNav />
      <main className="mx-auto max-w-4xl px-4 py-6">
        <Link href="/quest" className="text-sm font-bold text-steppe underline-offset-2 hover:underline">← Steppe map</Link>
        <div className="mt-2 flex items-baseline gap-3">
          <h1 className="text-4xl font-black text-steppe">{region.name}</h1>
          <span className="text-2xl font-bold text-gold">{region.kk}</span>
        </div>
        <p className="text-wolf">Theme: {CATEGORY_LABELS[region.category]}</p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Card className="bg-steppe text-warm">
            <div className="mb-2 text-sm font-bold text-gold">Elder&apos;s clip</div>
            <video
              controls
              poster="/img/wall-map.svg"
              className="aspect-video w-full rounded-2xl bg-black/30"
            >
              <source src="" type="video/mp4" />
              Your browser cannot play this clip.
            </video>
            <p className="mt-2 text-xs text-warm/70">
              Placeholder, real elder videos are uploaded later via /admin/content.
            </p>
          </Card>

          <Card>
            <div className="mb-2 text-sm font-bold text-steppe-700">Did you know?</div>
            <p className="text-steppe-700">{region.fact}</p>
            <Link href={`/play/sozdik-match?cat=${region.category}`}>
              <Button variant="gold" size="lg" className="mt-4 w-full">
                Play {CATEGORY_LABELS[region.category]} Match
              </Button>
            </Link>
          </Card>
        </div>

        <h2 className="mt-8 mb-3 text-xl font-black text-steppe">Words of {region.name}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {vocab.map((v) => (
            <motion.div key={v.slug} whileHover={{ y: -4 }} className="rounded-2xl bg-felt p-3 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imgFor(v)} alt={baseText(v, p.baseLanguage)} className="mx-auto h-16 w-16" />
              <div className="mt-1 font-black text-steppe">{v.kk}</div>
              <div className="text-xs text-wolf">{baseText(v, p.baseLanguage)}</div>
            </motion.div>
          ))}
        </div>

        {next && (
          <div className="mt-8 rounded-3xl bg-steppe p-6 text-center text-warm">
            {nextUnlocked ? (
              <p className="font-bold text-gold">{next.name} is already unlocked, explore on!</p>
            ) : (
              <>
                <p className="mb-3 font-bold">Finished exploring {region.name}?</p>
                <Button variant="gold" size="lg" onClick={() => store.unlockRegion(next.id)}>
                  Unlock {next.name} →
                </Button>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
