import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, getMyRole } from "@/lib/profiles";
import { getStory, recordStoryView } from "@/lib/stories";
import { isFollowing } from "@/lib/community";
import { storyCategoryIcon } from "@/lib/storyCategories";
import FollowButton from "@/components/FollowButton";
import StoryLikeButton from "@/components/StoryLikeButton";
import StoryAdminBar from "@/components/StoryAdminBar";
import StoryDeleteButton from "@/components/StoryDeleteButton";
import { Icon } from "@/components/Icon";
import { colors, radius, shadow } from "@/lib/theme";

function initials(name: string): string {
  const p = name.trim().split(/\s+/);
  return (p[0]?.[0] ?? "") + (p[1]?.[0] ?? "");
}

function fmtDate(d: string | null): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default async function StoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [story, role] = await Promise.all([getStory(id, user.id), getMyRole()]);
  if (!story) notFound();

  const isOwner = story.author_id === user.id;
  const isAdmin = role === "admin";
  const followsAuthor = isOwner ? false : await isFollowing(user.id, story.author_id);

  // Count this read (deduped per viewer/day; author self-views are skipped).
  // The displayed total comes from getStory above, so a brand-new reader's
  // own view lands on the next load — avoids inflating the count on refresh.
  if (story.status === "published" && !isOwner) {
    await recordStoryView(story.id, user.id, story.author_id);
  }

  return (
    <article style={{ maxWidth: 780, margin: "0 auto", padding: "32px", width: "100%" }}>
      <Link href="/stories" style={{ fontSize: 13.5, color: colors.brand, fontWeight: 600 }}>‹ All stories</Link>

      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0 12px", flexWrap: "wrap" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: colors.brandDeep, background: colors.tintBlue, padding: "4px 12px", borderRadius: radius.pill }}>
          <Icon name={storyCategoryIcon(story.category)} size={14} /> {story.category}
        </span>
        {story.is_featured && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: "#fff", background: colors.brand, padding: "4px 12px", borderRadius: radius.pill }}>
            <Icon name="sparkle" size={13} /> Featured
          </span>
        )}
        {story.status === "draft" && (
          <span style={{ fontSize: 12, fontWeight: 700, color: colors.inkMuted, background: colors.bg, padding: "4px 12px", borderRadius: radius.pill }}>Draft</span>
        )}
      </div>

      <h1 style={{ fontSize: 32, fontWeight: 800, color: colors.ink, margin: "0 0 16px", lineHeight: 1.2 }}>{story.title}</h1>

      {/* Author */}
      <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 22 }}>
        <Link href={`/scholars/${story.author_id}`}>
          {story.author_avatar ? (
            <Image src={story.author_avatar} alt={story.author_name} width={44} height={44} style={{ width: 44, height: 44, borderRadius: 999, objectFit: "cover" }} />
          ) : (
            <span style={{ width: 44, height: 44, borderRadius: 999, background: colors.tintBlueDeep, color: colors.brandDeep, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, textTransform: "uppercase" }}>{initials(story.author_name)}</span>
          )}
        </Link>
        <div>
          <Link href={`/scholars/${story.author_id}`} style={{ fontSize: 15, fontWeight: 700, color: colors.ink }}>{story.author_name}</Link>
          <div style={{ fontSize: 13, color: colors.inkFaint, display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
            <span>{fmtDate(story.published_at || story.created_at)}</span>
            {story.read_minutes ? <span>· {story.read_minutes} min read</span> : null}
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              · <Icon name="eye" size={14} /> {story.view_count} {story.view_count === 1 ? "view" : "views"}
            </span>
          </div>
        </div>
        {!isOwner && (
          <div style={{ marginInlineStart: "auto" }}>
            <FollowButton targetId={story.author_id} initialFollowing={followsAuthor} size="sm" />
          </div>
        )}
      </div>

      {isAdmin && <StoryAdminBar storyId={story.id} initialFeatured={story.is_featured} consent={story.featured_consent} />}

      {/* Cover */}
      {story.cover_image_url && (
        <div style={{ position: "relative", width: "100%", height: 340, borderRadius: radius.lg, overflow: "hidden", marginBottom: 26, boxShadow: shadow.card }}>
          <Image src={story.cover_image_url} alt={story.title} fill style={{ objectFit: "cover" }} priority />
        </div>
      )}

      {/* Body */}
      <div style={{ fontSize: 17, color: colors.ink, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{story.body}</div>

      {/* Footer actions */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginTop: 32, paddingTop: 22, borderTop: `1px solid ${colors.border}` }}>
        <StoryLikeButton storyId={story.id} initialLiked={story.liked} initialCount={story.like_count} />
        {isOwner && (
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Link href={`/stories/${story.id}/edit`} style={{ background: colors.tintBlue, color: colors.brandDeep, border: `1.5px solid ${colors.borderBlue}`, borderRadius: radius.pill, padding: "8px 18px", fontSize: 13, fontWeight: 700 }}>Edit</Link>
            <StoryDeleteButton storyId={story.id} />
          </div>
        )}
      </div>
    </article>
  );
}
