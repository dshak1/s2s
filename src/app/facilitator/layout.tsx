import { requireTeam } from "@/lib/auth";

// The facilitator console reads the live session roster, which 0005_identity.sql
// restricts to team members. Sign-in is required for the realtime view to
// return rows at all.
export default async function FacilitatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireTeam(undefined, "/facilitator");
  return <>{children}</>;
}
