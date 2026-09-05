import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Brain, Lightbulb } from "lucide-react";
import { DAILY_FACTS, getDailyFact } from "@/content/daily-facts";

export function generateStaticParams() {
  return DAILY_FACTS.map((fact) => ({ slug: fact.slug }));
}

export default async function FactPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const fact = getDailyFact(slug);
  if (!fact) notFound();

  return (
    <main className="min-h-dvh bg-[#dff7ff] px-5 py-10 text-steppe">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-black text-steppe/70 hover:text-steppe">
          <ArrowLeft size={18} /> Home
        </Link>

        <article className="mt-5 rounded-[2rem] border-4 border-steppe bg-white p-6 shadow-[8px_9px_0_0_#244e84] sm:p-8">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-gold text-steppe">
            <Lightbulb size={27} />
          </div>
          <div className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-terra">Fact of the day</div>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">{fact.title}</h1>
          <p className="mt-4 text-lg font-extrabold leading-8 text-steppe/85">{fact.teaser}</p>
          <p className="mt-5 text-base font-bold leading-8 text-steppe/70">{fact.detail}</p>

          <div className="mt-6 flex flex-wrap gap-2">
            {fact.topics.map((topic) => (
              <span key={topic} className="rounded-full bg-felt px-3 py-1 text-xs font-black text-steppe/70">{topic}</span>
            ))}
          </div>

          <div className="mt-7 rounded-2xl bg-[#fff3cf] p-5">
            <h2 className="font-black">Turn the fact into practice</h2>
            <p className="mt-1 text-sm font-bold text-steppe/70">The adaptive quiz will prioritize related concepts when they are weak or due for review.</p>
            <Link href="/quiz" className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-gold px-5 py-3 font-black text-steppe shadow-[3px_4px_0_0_#b8960a]">
              <Brain size={19} /> Take a quiz
            </Link>
          </div>
        </article>
      </div>
    </main>
  );
}
