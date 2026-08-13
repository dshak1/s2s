import Link from "next/link";
import { ClipboardList, PlayCircle, Users } from "lucide-react";
import { HomeCoverBackdrop } from "@/components/home-cover-backdrop";
import { IS_LITE } from "@/lib/lite";
import { ONLINE_FEATURES_ENABLED } from "@/lib/online-features";

export default async function Home({
  searchParams,
}: {
  // Supabase's own /auth/v1/verify endpoint sends a failed magic-link
  // straight here (not to /auth/callback) — it doesn't know which app route
  // to use for an error case, so it falls back to the bare site_url. Without
  // this, that failure landed silently on the normal kid homepage with raw
  // error params sitting unexplained in the address bar.
  searchParams: Promise<{ error?: string; error_code?: string; error_description?: string }>;
}) {
  const { error_code, error_description } = await searchParams;

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#dff7ff] text-steppe">
      <HomeCoverBackdrop />

      <main className="relative z-10 mx-auto grid min-h-dvh max-w-6xl items-center gap-8 px-6 pb-28 pt-16 md:grid-cols-[1.05fr_.95fr] md:pb-20">
        {error_code && (
          <div className="col-span-full -mb-2 rounded-2xl border-2 border-[#ff9a4f] bg-white/90 px-5 py-3 text-center text-sm font-bold text-steppe shadow-sm backdrop-blur md:text-left">
            {error_code === "otp_expired"
              ? "That sign-in link expired or was already used."
              : (error_description?.replaceAll("+", " ") ?? "That sign-in link didn't work.")}{" "}
            <Link href="/login" className="underline decoration-2 underline-offset-2">
              Request a new one
            </Link>
            .
          </div>
        )}
        <section className="max-w-2xl text-center md:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/75 px-4 py-2 text-sm font-extrabold text-steppe shadow-sm backdrop-blur">
            CC-UNESCO • UBC / SFU Kazakh Workshops
          </div>
          <h1 className="mt-6 text-5xl font-black leading-[1.02] text-steppe sm:text-7xl">
            Қазақ тілін үйренейік
          </h1>
          <p className="mt-5 max-w-xl text-xl font-extrabold leading-8 text-steppe/80 md:text-2xl">
            Let&apos;s learn Kazakh, one fun word at a time.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row md:items-start">
            <Link
              href="/play"
              className="inline-flex items-center justify-center gap-3 rounded-2xl bg-gold px-8 py-4 text-lg font-black text-steppe-700 shadow-[4px_5px_0_0_#b8960a] transition hover:brightness-105 active:translate-y-[2px] active:shadow-none"
            >
              <PlayCircle size={24} /> Ойнау
            </Link>
            {!IS_LITE && ONLINE_FEATURES_ENABLED && (
              <Link
                href="/join"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-steppe bg-white/80 px-6 py-4 text-base font-black text-steppe shadow-sm transition hover:bg-[#fff3cf]"
              >
                <Users size={20} /> Join session
              </Link>
            )}
          </div>
          {!IS_LITE && ONLINE_FEATURES_ENABLED && (
            <Link
              href="/facilitator"
              className="mt-5 inline-flex items-center gap-2 text-sm font-black text-steppe/70 underline-offset-4 hover:text-steppe hover:underline"
            >
              <ClipboardList size={16} /> Facilitator tools
            </Link>
          )}
        </section>

        <section className="relative mx-auto flex min-h-[340px] w-full max-w-md items-end justify-center">
          <div className="absolute left-2 top-2 rounded-[1.25rem] border-4 border-steppe/[.12] bg-white px-5 py-4 text-center text-steppe shadow-[0_12px_0_rgba(30,77,140,.08)]">
            <div className="text-3xl font-black leading-none">Кеттік!</div>
            <div className="mt-1 text-sm font-extrabold text-steppe/65">Let&apos;s go!</div>
          </div>
          <HeroMascot />
          <div className="absolute bottom-1 h-9 w-72 rounded-[50%] bg-steppe/10 blur-sm" />
        </section>
      </main>
    </div>
  );
}

function HeroMascot() {
  return (
    <svg className="relative z-10 w-[min(88vw,360px)]" viewBox="0 0 260 280" aria-hidden="true">
      <path d="M80 124c-38 23-39 86-5 116 36 32 116 29 146-7 27-33 13-93-24-113-32-17-84-18-117 4Z" fill="#f7f2e7" stroke="#244e84" strokeWidth="8" />
      <path d="M91 112 66 50l61 36M170 86l61-36-24 63" fill="#f7f2e7" stroke="#244e84" strokeLinejoin="round" strokeWidth="8" />
      <path d="M92 112c26-21 84-23 116 1 29 21 39 66 25 101-15 38-50 58-98 58-54 0-95-28-105-67-9-36 10-71 62-93Z" fill="#fffdf5" stroke="#244e84" strokeWidth="8" />
      <circle cx="117" cy="158" r="9" fill="#244e84" />
      <circle cx="181" cy="158" r="9" fill="#244e84" />
      <path d="M140 179c7 6 16 6 23 0M151 168l-11 10h22Z" fill="#ff8f9f" stroke="#244e84" strokeLinejoin="round" strokeWidth="4" />
      <path d="M78 176H43M82 193H48M215 176h35M211 193h32" stroke="#244e84" strokeLinecap="round" strokeWidth="6" />
      <path d="M105 83c23-10 52-10 75 0" stroke="#ff8f4f" strokeLinecap="round" strokeWidth="10" />
      <path d="M96 233c-12 20-41 20-52 2M187 233c17 17 44 15 54-6" fill="none" stroke="#244e84" strokeLinecap="round" strokeWidth="8" />
      <circle cx="77" cy="74" r="8" fill="#ffcf4a" />
      <circle cx="210" cy="74" r="8" fill="#ffcf4a" />
    </svg>
  );
}
