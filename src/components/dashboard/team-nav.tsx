import Link from "next/link";
import { ROLE_LABELS, type TeamMember } from "@/lib/auth";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/wishlist", label: "Ideas" },
  { href: "/admin/feedback", label: "Feedback" },
  { href: "/admin/team", label: "Team" },
  { href: "/play", label: "The app" },
] as const;

export function TeamNav({ member, current }: { member: TeamMember; current: string }) {
  return (
    <div className="border-b border-black/8 bg-white px-6 py-4">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap items-center gap-1">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-full px-3 py-1.5 text-sm font-black transition ${
                l.href === current
                  ? "bg-steppe text-white"
                  : "text-wolf hover:bg-felt hover:text-steppe"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-wolf">
            {member.display_name} · {ROLE_LABELS[member.role]}
          </span>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-full border-2 border-steppe bg-white px-3 py-1.5 text-xs font-extrabold text-steppe transition hover:bg-steppe/5"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
