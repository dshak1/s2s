import { cn } from "@/lib/utils";

// Kazakh on top, English underneath and smaller — the "Kettik! / Let's go!"
// treatment from the welcome flow, made reusable so every button and title can
// wear it (issue #25).
//
// The point is that a kid who does not read Kazakh yet is never stuck, and a
// kid who does gets the word taught to them by the interface itself instead of
// having it replaced by English. So this is deliberately not a language
// *switch*: both are always on screen, Kazakh first, every time. `baseText()`
// in src/lib/lang.ts is the other thing — it picks which language *explains*
// vocab, and it is unrelated to this.
//
// Sizes are relative (`em`, not `px`) so one component works on a large gold
// CTA and a small tile caption without a size prop.
export function Bilingual({
  kk,
  children,
  className,
  align = "center",
}: {
  /** The Kazakh label. Always the top line. */
  kk: string;
  /** The English label. Always the bottom line, smaller. */
  children: React.ReactNode;
  className?: string;
  align?: "center" | "left";
}) {
  return (
    <span className={cn("inline-flex flex-col leading-[1.15]", align === "center" ? "items-center" : "items-start", className)}>
      <span>{kk}</span>
      <span className="text-[0.62em] font-bold uppercase tracking-wide opacity-70">{children}</span>
    </span>
  );
}
