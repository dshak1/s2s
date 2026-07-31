import { requireTeam } from "@/lib/auth";

// Every /admin surface is team-only. This replaces the shared
// NEXT_PUBLIC_ADMIN_PASSWORD gate that used to live inside the content page.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // No `next` here — a layout can't know which admin page was asked for, and
  // guessing sends people to the wrong one after sign-in. The page-level
  // requireTeam calls carry their own.
  await requireTeam();
  return <>{children}</>;
}
