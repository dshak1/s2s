import Link from "next/link";

export function ComingSoon({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-steppe px-6 text-center text-warm">
      <p className="text-xs font-black uppercase tracking-wider text-gold">Coming soon</p>
      <h1 className="text-3xl font-black">{title}</h1>
      <p className="max-w-sm text-warm/75">{detail ?? "We're still polishing this one. Check back soon."}</p>
      <Link
        href="/play"
        className="mt-2 inline-flex items-center gap-2 rounded-2xl bg-gold px-5 py-3 font-black text-steppe-700 shadow-[3px_4px_0_0_#b8960a] transition hover:brightness-105"
      >
        Back to games
      </Link>
    </div>
  );
}
