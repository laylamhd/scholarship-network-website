import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/profiles";
import CreateGroupForm from "@/components/CreateGroupForm";
import { colors } from "@/lib/theme";

export default async function NewGroupPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px", width: "100%" }}>
      <Link href="/groups" style={{ fontSize: 14, color: colors.inkMuted, fontWeight: 600 }}>‹ Groups</Link>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: colors.ink, margin: "10px 0 6px" }}>Create a group</h1>
      <p style={{ fontSize: 14.5, color: colors.inkFaint, margin: "0 0 22px" }}>
        Start a community for your university, country, or a shared theme. You’ll be its first admin.
      </p>
      <CreateGroupForm />
    </div>
  );
}
