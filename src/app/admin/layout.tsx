import { requireTeam } from "@/lib/auth";

// Every /admin surface is team-only. This replaces the shared
// NEXT_PUBLIC_ADMIN_PASSWORD gate that used to live inside the content page.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireTeam(undefined, "/admin/content");
  return <>{children}</>;
}
