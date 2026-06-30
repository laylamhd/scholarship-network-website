import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/profiles";
import { getProject } from "@/lib/volunteer";
import ProjectForm from "@/components/ProjectForm";
import { updateProject } from "@/app/(app)/volunteer/actions";
import { colors } from "@/lib/theme";

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const project = await getProject(id, user.id);
  if (!project) notFound();
  if (project.organizer_id !== user.id) redirect(`/volunteer/${id}`);

  const action = updateProject.bind(null, id);

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "32px", width: "100%" }}>
      <Link href={`/volunteer/${id}`} style={{ fontSize: 13.5, color: colors.brand, fontWeight: 600 }}>‹ Back</Link>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: colors.ink, margin: "10px 0 22px" }}>Edit project</h1>
      <ProjectForm
        action={action}
        submitLabel="Save changes"
        initial={{
          title: project.title,
          cause: project.cause,
          description: project.description,
          location: project.location ?? "",
          image_url: project.image_url ?? "",
          start_date: project.start_date ?? "",
          end_date: project.end_date ?? "",
          status: project.status,
        }}
      />
    </div>
  );
}
