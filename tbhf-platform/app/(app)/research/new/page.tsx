import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getMyRole } from "@/lib/profiles";
import ResearchForm from "@/components/ResearchForm";
import { createResearch } from "@/app/(app)/research/actions";
import { colors } from "@/lib/theme";

export default async function NewResearchPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const role = await getMyRole();
  const isAdmin = role === "admin";

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "32px", width: "100%" }}>
      <Link href="/research" style={{ fontSize: 13.5, color: colors.brand, fontWeight: 600 }}>‹ Back to hub</Link>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: colors.ink, margin: "10px 0 4px" }}>Share research</h1>
      <p style={{ fontSize: 14.5, color: colors.inkFaint, margin: "0 0 22px" }}>
        {isAdmin
          ? "Publish a research summary or opportunity for the TBHF research community."
          : "Share a research summary or opportunity. It will be reviewed by an admin before it appears in the hub."}
      </p>
      <ResearchForm action={createResearch} submitLabel="Publish" pendingReview={!isAdmin} />
    </div>
  );
}
