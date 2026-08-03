import { requireTeam } from "@/lib/auth";
import { FacilitatorSessionBanner } from "@/components/facilitator-session-banner";
import { ComingSoon } from "@/components/coming-soon";
import { ONLINE_FEATURES_ENABLED } from "@/lib/online-features";

// The facilitator console reads the live session roster, which 0005_identity.sql
// restricts to team members. Sign-in is required for the realtime view to
// return rows at all.
//
// Gated before that sign-in check, not after: while online features are off
// for the public deploy this shows the same "coming soon" to everyone,
// staff included, rather than prompting a login just to see a placeholder.
export default async function FacilitatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!ONLINE_FEATURES_ENABLED) {
    return <ComingSoon title="Facilitator tools" detail="Live workshop tools are on their way." />;
  }
  await requireTeam(undefined, "/facilitator");
  return (
    <>
      {children}
      <FacilitatorSessionBanner />
    </>
  );
}
