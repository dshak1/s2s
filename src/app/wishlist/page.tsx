import { redirect } from "next/navigation";

// The wishlist became the triage board in 0009_triage.sql — votes with real
// identity, comments, attachments, and a required decision note.
export default function WishlistRedirect() {
  redirect("/ideas");
}
