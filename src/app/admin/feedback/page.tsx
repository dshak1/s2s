import { requireTeam } from "@/lib/auth";
import { AdminShell } from "@/components/admin/shell";
import { FeedbackList } from "./feedback-list";

export const metadata = { title: "Feedback · Steppe to Screen" };
export const dynamic = "force-dynamic";

export default async function AdminFeedbackPage() {
  const member = await requireTeam(undefined, "/admin/feedback");
  return (
    <AdminShell
      member={member}
      current="/admin/feedback"
      title="In-app feedback"
      subtitle="Sent from the feedback button inside the app. Not tickets, raw notes."
    >
      <FeedbackList />
    </AdminShell>
  );
}
