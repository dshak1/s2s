import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Support | Steppe to Screen",
  description: "Help with Steppe to Screen games, profiles, camera, and microphone access.",
};

const HELP = [
  {
    title: "The microphone is not working",
    body: "Open iPhone Settings → Privacy & Security → Microphone and allow Steppe to Screen. In a pronunciation game, you can still use the on-screen answer controls if speech recognition is unavailable.",
  },
  {
    title: "The camera or photo picker is not working",
    body: "Open iPhone Settings → Privacy & Security → Camera or Photos and allow Steppe to Screen. Photos are only selected when you choose to add artwork, a character, or homework.",
  },
  {
    title: "My progress is missing",
    body: "Progress is local-first and normally stays on the device. If you have a recovery code, open the profile screen and use it to restore the matching profile. Include that code when contacting support, but do not post it publicly.",
  },
  {
    title: "How do I delete my information?",
    body: "Resetting the profile, deleting the app, or clearing its website data removes the local copy only. For server-side access, correction, export, or deletion, email support with the learner recovery code or random profile ID, or the team-account email, so we can locate the correct record.",
  },
  {
    title: "Can I play without optional data access?",
    body: "Yes. No email account is required. You can decline Camera, Photos, and Microphone access, avoid uploads and gallery sharing, and use the on-screen controls in pronunciation games.",
  },
];

export default function SupportPage() {
  return (
    <main className="min-h-dvh bg-[#dff7ff] px-5 py-12 text-steppe sm:px-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-black underline decoration-2 underline-offset-4">
          ← Steppe to Screen
        </Link>
        <div className="mt-6 rounded-[1.75rem] border-2 border-steppe/15 bg-white p-6 shadow-[5px_6px_0_0_rgba(30,77,140,.10)] sm:p-10">
          <p className="text-sm font-black uppercase tracking-[.16em] text-terra">Help</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight">Steppe to Screen Support</h1>
          <p className="mt-4 max-w-2xl text-lg font-bold leading-7 text-steppe/75">
            Get help with Kazakh-language games, profiles, workshops, and device permissions.
          </p>

          <div className="mt-8 space-y-4">
            {HELP.map((item) => (
              <section key={item.title} className="rounded-2xl border-2 border-felt bg-warm p-5">
                <h2 className="text-xl font-black">{item.title}</h2>
                <p className="mt-2 font-semibold leading-7 text-steppe/80">{item.body}</p>
              </section>
            ))}
          </div>

          <section id="privacy-requests" className="mt-8 scroll-mt-8 rounded-2xl bg-steppe px-5 py-6 text-white shadow-[4px_5px_0_0_#173c6e]">
            <h2 className="text-xl font-black">Contact support</h2>
            <p className="mt-2 font-semibold text-white/85">
              Tell us which screen or game you were using and what happened. For a privacy request, include
              the learner recovery code or random profile ID, or the team-account email. Avoid sending a
              child&apos;s full legal name when the code is enough.
            </p>
            <a
              href="mailto:dshakimov@gmail.com?subject=Steppe%20to%20Screen%20Privacy%20or%20Support%20Request"
              className="mt-4 inline-flex rounded-xl bg-gold px-4 py-3 font-black text-steppe-700 shadow-[3px_4px_0_0_#b8960a] active:translate-y-[2px] active:shadow-none"
            >
              Email dshakimov@gmail.com
            </a>
          </section>

          <p className="mt-6 text-sm font-bold text-steppe/65">
            See our{" "}
            <Link href="/privacy" className="underline decoration-2 underline-offset-4">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
