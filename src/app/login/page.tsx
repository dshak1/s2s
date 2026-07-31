import Link from "next/link";
import { redirect } from "next/navigation";
import { getTeamMember, ROLE_LABELS, type TeamRole } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata = { title: "Team sign-in · Steppe to Screen" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string;
    error?: string;
    denied?: string;
    pending?: string;
  }>;
}) {
  const { next, error, denied, pending } = await searchParams;
  const target = next && next.startsWith("/") ? next : "/dashboard";

  // Already signed in and not bounced for a role problem — go straight through.
  const member = await getTeamMember();
  if (member && !denied && !pending) redirect(target);

  if (pending && member) {
    return (
      <div className="min-h-dvh bg-warm font-admin">
        <main className="mx-auto max-w-md px-4 py-16">
          <Link href="/play" className="text-xl font-black text-steppe">
            Steppe<span className="text-[#ff8f4f]">2</span>Screen
          </Link>
          <div className="mt-6 rounded-2xl bg-white p-6 shadow ring-1 ring-black/5">
            <h1 className="text-xl font-black text-steppe">You&apos;re signed in.</h1>
            <p className="mt-2 text-sm font-semibold text-wolf">
              Signed in as <strong>{member.email}</strong>, waiting for an admin to
              give you a role. Ping Diar or Sean and you&apos;ll be in.
            </p>
            <p className="mt-3 text-xs font-semibold text-wolf/70">
              A sign-in link proves you own an email address, not that you&apos;re on
              this team — so accounts start with no access to learner data.
            </p>
            <div className="mt-4 flex gap-2">
              <Link
                href="/play"
                className="rounded-full bg-steppe px-4 py-2 text-sm font-extrabold text-white transition hover:bg-steppe-700"
              >
                Go play instead
              </Link>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="rounded-full border-2 border-steppe bg-white px-4 py-2 text-sm font-extrabold text-steppe transition hover:bg-steppe/5"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </main>
      </div>
    );
  }

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
