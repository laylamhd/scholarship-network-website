import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/profiles";
import { getResearch } from "@/lib/research";
import ResearchForm from "@/components/ResearchForm";
import { updateResearch } from "@/app/(app)/research/actions";
import { colors } from "@/lib/theme";

export default async function EditResearchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const post = await getResearch(id, user.id);
  if (!post) notFound();
  if (post.author_id !== user.id) redirect(`/research/${id}`);

  const action = updateResearch.bind(null, id);

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "32px", width: "100%" }}>
      <Link href={`/research/${id}`} style={{ fontSize: 13.5, color: colors.brand, fontWeight: 600 }}>‹ Back</Link>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: colors.ink, margin: "10px 0 22px" }}>Edit contribution</h1>
      <ResearchForm
        action={action}
        submitLabel="Save changes"
        initial={{
          title: post.title,
          kind: post.kind,
          field: post.field ?? "",
          summary: post.summary,
          link_url: post.link_url ?? "",
          file_url: post.file_url ?? "",
          seeking_collaborators: post.seeking_collaborators,
        }}
      />
    </div>
  );
}
