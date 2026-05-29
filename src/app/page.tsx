import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-steppe text-warm">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-steppe-700 to-transparent" />
      <div className="relative mx-auto flex min-h-dvh max-w-3xl flex-col items-center justify-center gap-8 px-6 text-center">
        <div className="rounded-full bg-gold px-4 py-1 text-sm font-extrabold text-steppe-700">
          CC-UNESCO • UBC / SFU Kazakh Workshops
        </div>
        <h1 className="text-5xl font-black leading-tight sm:text-7xl">
          Steppe <span className="text-gold">to</span> Screen
        </h1>
        <p className="max-w-xl text-lg text-warm/90">
          Learn Kazakh words, draw your own <span className="font-bold text-gold">tańba</span>,
          explore the steppe, and earn badges — one workshop at a time.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/join">
            <Button variant="gold" size="lg">I&apos;m a Kid — Join a Session</Button>
          </Link>
          <Link href="/play">
            <Button variant="outline" size="lg" className="border-warm bg-white/10 text-warm">
              Play the Games
            </Button>
          </Link>
        </div>
        <Link href="/facilitator" className="text-sm font-bold text-warm/70 underline-offset-4 hover:underline">
          I&apos;m a facilitator →
        </Link>
      </div>
    </div>
  );
}
