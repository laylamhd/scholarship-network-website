import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/profiles";
import { getStory } from "@/lib/stories";
import StoryForm from "@/components/StoryForm";
import { updateStory } from "@/app/(app)/stories/actions";
import { colors } from "@/lib/theme";

export default async function EditStoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const story = await getStory(id, user.id);
  if (!story) notFound();
  if (story.author_id !== user.id) redirect(`/stories/${id}`);

  const action = updateStory.bind(null, id);

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px", width: "100%" }}>
      <Link href={`/stories/${id}`} style={{ fontSize: 13.5, color: colors.brand, fontWeight: 600 }}>‹ Back to story</Link>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: colors.ink, margin: "10px 0 22px" }}>Edit story</h1>
      <StoryForm
        action={action}
        submitLabel="Save changes"
        initial={{
          title: story.title,
          category: story.category,
          excerpt: story.excerpt ?? "",
          body: story.body,
          cover_image_url: story.cover_image_url ?? "",
          status: story.status,
          featured_consent: story.featured_consent,
        }}
      />
    </div>
  );
}
