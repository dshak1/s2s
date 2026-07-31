import { redirect } from "next/navigation";

// Superseded by /ideas, which now carries the staff decision controls.
export default function AdminWishlistRedirect() {
  redirect("/ideas");
}
