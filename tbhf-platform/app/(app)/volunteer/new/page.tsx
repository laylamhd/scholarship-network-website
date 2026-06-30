import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/profiles";
import ProjectForm from "@/components/ProjectForm";
import { createProject } from "@/app/(app)/volunteer/actions";
import { colors } from "@/lib/theme";

export default async function NewProjectPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "32px", width: "100%" }}>
      <Link href="/events?tab=volunteering" style={{ fontSize: 13.5, color: colors.brand, fontWeight: 600 }}>‹ Back to Volunteering</Link>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: colors.ink, margin: "10px 0 4px" }}>Start a community project</h1>
      <p style={{ fontSize: 14.5, color: colors.inkFaint, margin: "0 0 22px" }}>
        Describe your project and recruit fellow scholars to help.
      </p>
      <ProjectForm action={createProject} submitLabel="Create project" />
    </div>
  );
}
