"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { summarizeExperimentEvents, useLearnerState } from "@/lib/learner-state";

export default function ExperimentsPage() {
  const learner = useLearnerState();
  const rows = summarizeExperimentEvents(learner.events);

  return (
    <main className="min-h-dvh bg-[#f7f2e7] px-5 py-10 text-steppe">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-black text-steppe/70 hover:text-steppe">
          <ArrowLeft size={18} /> Home
        </Link>
        <h1 className="mt-5 text-4xl font-black">Learning flow experiment</h1>
        <p className="mt-2 max-w-2xl font-bold leading-7 text-steppe/70">
          Lightweight, privacy-first instrumentation. Events are anonymous and stored on this device; the same event shape can be aggregated server-side when consented analytics are enabled.
        </p>

        <div className="mt-7 overflow-x-auto rounded-2xl border-2 border-steppe bg-white">
          <table className="w-full min-w-[650px] text-left">
            <thead className="bg-steppe text-white">
              <tr>
                <th className="px-4 py-3">Variant</th>
                <th className="px-4 py-3">Exposures</th>
                <th className="px-4 py-3">Quiz starts</th>
                <th className="px-4 py-3">Completions</th>
                <th className="px-4 py-3">Start rate</th>
                <th className="px-4 py-3">Completion rate</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.variant} className="border-t border-steppe/15 font-bold">
                  <td className="px-4 py-3 font-black">{row.variant}</td>
                  <td className="px-4 py-3">{row.exposures}</td>
                  <td className="px-4 py-3">{row.quizStarts}</td>
                  <td className="px-4 py-3">{row.quizCompletes}</td>
                  <td className="px-4 py-3">{Math.round(row.startRate * 100)}%</td>
                  <td className="px-4 py-3">{Math.round(row.completionRate * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="mt-6 rounded-2xl bg-white p-5">
          <h2 className="font-black">Variant definitions</h2>
          <p className="mt-2 text-sm font-bold leading-6 text-steppe/70">
            A prioritizes an immediate quiz. B emphasizes a welcome menu plus the daily fact. C emphasizes a personalized review suggestion. D emphasizes fact → related question → quiz.
          </p>
        </section>
      </div>
    </main>
  );
}
