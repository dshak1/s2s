import Link from "next/link";
import { ROLE_LABELS, type TeamMember } from "@/lib/auth";

// The internal tools do NOT wear the kids' theme. No Nunito, no cream, no gold
// gradients — that palette belongs to a 7-year-old's game. This is a cool-grey,
// dense, Inter-set tool surface: small type, real borders, tabular numbers.

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/tickets", label: "Tickets" },
  { href: "/label", label: "Label" },
  { href: "/admin/feedback", label: "Feedback" },
  { href: "/admin/vocab", label: "Vocab" },
  { href: "/admin/team", label: "Team" },
] as const;

export function AdminShell({
  member,
  current,
  title,
  subtitle,
  actions,
  children,
}: {
  member: TeamMember;
  current: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-[#f7f8fa] font-admin text-[#0f172a] antialiased">
      <header className="sticky top-0 z-20 border-b border-[#e2e5ea] bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-5 py-2.5">
          <Link href="/dashboard" className="text-[13px] font-semibold tracking-tight">
            Steppe<span className="text-[#64748b]">2</span>Screen
            <span className="ml-1.5 rounded bg-[#eef1f5] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[#64748b]">
              internal
            </span>
          </Link>

          <nav className="flex items-center gap-0.5">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-md px-2.5 py-1.5 text-[13px] transition ${
                  l.href === current
                    ? "bg-[#eef1f5] font-semibold text-[#0f172a]"
                    : "text-[#64748b] hover:bg-[#f1f3f6] hover:text-[#0f172a]"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <Link
              href="/play"
              className="text-[12px] text-[#64748b] transition hover:text-[#0f172a]"
            >
              Open the app ↗
            </Link>
            <span className="text-[12px] text-[#94a3b8]">
              {member.display_name} · {ROLE_LABELS[member.role]}
            </span>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="rounded-md border border-[#e2e5ea] bg-white px-2.5 py-1 text-[12px] font-medium text-[#475569] transition hover:bg-[#f1f3f6]"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-7">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[19px] font-semibold tracking-tight">{title}</h1>
            {subtitle && (
              <p className="mt-0.5 text-[13px] leading-relaxed text-[#64748b]">{subtitle}</p>
            )}
          </div>
          {actions}
        </div>
        {children}
      </div>
    </div>
  );
}

export function Panel({
  title,
  hint,
  children,
  className = "",
}: {
  title?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-lg border border-[#e2e5ea] bg-white ${className}`}
    >
      {title && (
        <header className="border-b border-[#eef1f5] px-4 py-3">
          <h2 className="text-[13px] font-semibold tracking-tight">{title}</h2>
          {hint && <p className="mt-0.5 text-[12px] text-[#94a3b8]">{hint}</p>}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-[#dbe0e6] px-4 py-8 text-center text-[13px] text-[#94a3b8]">
      {children}
    </p>
  );
}
