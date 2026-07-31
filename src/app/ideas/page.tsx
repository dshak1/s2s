import { redirect } from "next/navigation";

// The idea board became the ticket board in 0015_tickets.sql.
export default function IdeasRedirect() {
  redirect("/tickets");
}
