import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getMyRole } from "@/lib/profiles";
import CommunityCreateForm from "@/components/CommunityCreateForm";
import { colors } from "@/lib/theme";

export default async function NewCommunityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Only full admins may create a community.
  const role = await getMyRole();
  if (role !== "admin") redirect("/community");

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px", width: "100%" }}>
      <Link href="/community" style={{ fontSize: 14, color: colors.inkMuted, fontWeight: 600 }}>‹ Communities</Link>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: colors.ink, margin: "10px 0 6px" }}>Create a community</h1>
      <p style={{ fontSize: 14.5, color: colors.inkFaint, margin: "0 0 22px" }}>
        Set it up, then add students and alumni from the community page.
      </p>
      <CommunityCreateForm />
    </div>
  );
}
