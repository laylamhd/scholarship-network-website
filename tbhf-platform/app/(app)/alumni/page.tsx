import { redirect } from "next/navigation";

// The Alumni Network now lives on the alumni Home dashboard (sidebar tab removed).
// Keep this route as a redirect so old links/bookmarks resolve.
export default function AlumniPage() {
  redirect("/");
}
