import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getMyRole } from "@/lib/profiles";
import StoryForm from "@/components/StoryForm";
import { createStory } from "@/app/(app)/stories/actions";
import { colors } from "@/lib/theme";

export default async function NewStoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const role = await getMyRole();
  const isAdmin = role === "admin";

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px", width: "100%" }}>
      <Link href="/stories" style={{ fontSize: 13.5, color: colors.brand, fontWeight: 600 }}>‹ Back to stories</Link>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: colors.ink, margin: "10px 0 4px" }}>Write a story</h1>
      <p style={{ fontSize: 14.5, color: colors.inkFaint, margin: "0 0 22px" }}>
        {isAdmin
          ? "Share your journey, research or experiences with the TBHF community."
          : "Share your journey, research or experiences. Your story will be reviewed by an admin before it appears to the community."}
      </p>
      <StoryForm action={createStory} submitLabel="Publish story" pendingReview={!isAdmin} />
    </div>
  );
}
