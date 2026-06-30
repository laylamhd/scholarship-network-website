import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getMyRole } from "@/lib/profiles";
import ShowcaseForm from "@/components/ShowcaseForm";
import { colors } from "@/lib/theme";

export default async function NewShowcasePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const role = await getMyRole();
  const isAdmin = role === "admin";

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px", width: "100%" }}>
      <Link href="/showcase" style={{ fontSize: 13.5, color: colors.brand, fontWeight: 600 }}>‹ Back to showcase</Link>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: colors.ink, margin: "10px 0 4px" }}>
        {isAdmin ? "Add to the showcase" : "Submit to the showcase"}
      </h1>
      <p style={{ fontSize: 14.5, color: colors.inkFaint, margin: "0 0 22px" }}>
        {isAdmin
          ? "Upload a photo, video, poster, artwork or presentation to feature in the gallery."
          : "Share a photo, video, poster, artwork or presentation. It will be reviewed by an admin before it appears in the gallery."}
      </p>
      <ShowcaseForm pendingReview={!isAdmin} />
    </div>
  );
}
