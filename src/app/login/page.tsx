import Link from "next/link";
import { redirect } from "next/navigation";
import { getTeamMember, ROLE_LABELS, type TeamRole } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata = { title: "Team sign-in · Steppe to Screen" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; denied?: string }>;
}) {
  const { next, error, denied } = await searchParams;
  const target = next && next.startsWith("/") ? next : "/dashboard";

  // Already signed in and not bounced for a role problem — go straight through.
  const member = await getTeamMember();
  if (member && !denied) redirect(target);

  return (
    <div className="min-h-dvh bg-warm font-admin">
      <main className="mx-auto max-w-md px-4 py-16">
        <div className="mb-6">
          <Link href="/play" className="text-xl font-black text-steppe">
            Steppe<span className="text-[#ff8f4f]">2</span>Screen
          </Link>
          <h1 className="mt-4 text-2xl font-black text-steppe">Team sign-in</h1>
          <p className="mt-1 text-sm font-semibold text-wolf">
            For educators, native speakers, and the build team. Kids don&apos;t need an
            account — they just tap Play.
          </p>
        </div>

        {denied && (
          <div className="mb-4 rounded-xl bg-terra/10 p-4 text-sm font-bold text-terra">
            Your account is signed in as {ROLE_LABELS[denied as TeamRole] ?? denied}, which
            doesn&apos;t have access to that page. Ask an admin to change your role.
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-xl bg-terra/10 p-4 text-sm font-bold text-terra">
            {error === "missing-code"
              ? "That sign-in link expired or was already used. Request a new one."
              : error}
          </div>
        )}

        <LoginForm next={target} />

        <p className="mt-6 text-xs font-semibold text-wolf/70">
          The first person to sign in becomes the admin and can set everyone else&apos;s
          role from /admin/team.
        </p>
      </main>
    </div>
  );
}
