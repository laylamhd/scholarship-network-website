import Link from "next/link";
import { safeUrl } from "@/lib/safeUrl";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/profiles";
import { getResearch, getCollaborators } from "@/lib/research";
import { signBucketUrl } from "@/lib/storage";
import { researchKindIcon } from "@/lib/researchKinds";
import { startConversation } from "@/app/(app)/messages/actions";
import ResearchCollabButton from "@/components/ResearchCollabButton";
import ResearchDeleteButton from "@/components/ResearchDeleteButton";
import { Icon } from "@/components/Icon";
import { colors, radius, shadow } from "@/lib/theme";

function initials(name: string): string {
  const p = name.trim().split(/\s+/);
  return (p[0]?.[0] ?? "") + (p[1]?.[0] ?? "");
}
function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default async function ResearchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const post = await getResearch(id, user.id);
  if (!post) notFound();
  const isOwner = post.author_id === user.id;
  const collaborators = isOwner ? await getCollaborators(post.id) : [];
  // SECURITY (BUG-007): research bucket is private — sign the download link here
  // (not in getResearch, which the edit form also uses with the raw path).
  const fileUrl = await signBucketUrl("research", post.file_url);

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "32px", width: "100%" }}>
      <Link href="/research" style={{ fontSize: 13.5, color: colors.brand, fontWeight: 600 }}>‹ Research hub</Link>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", margin: "16px 0 12px" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: colors.brandDeep, background: colors.tintBlue, padding: "4px 12px", borderRadius: radius.pill }}>
          <Icon name={researchKindIcon(post.kind)} size={14} /> {post.kind}
        </span>
        {post.field && <span style={{ fontSize: 12, fontWeight: 700, color: colors.inkMuted, background: colors.bg, padding: "4px 12px", borderRadius: radius.pill }}>{post.field}</span>}
        {post.seeking_collaborators && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: "#0F8F6B", background: "#E6F6F0", padding: "4px 12px", borderRadius: radius.pill }}>
            <Icon name="users" size={13} /> Seeking collaborators
          </span>
        )}
      </div>

      <h1 style={{ fontSize: 28, fontWeight: 800, color: colors.ink, margin: "0 0 16px", lineHeight: 1.2 }}>{post.title}</h1>

      {/* Author */}
      <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 22 }}>
        <Link href={`/scholars/${post.author_id}`}>
          {post.author_avatar ? (
            <Image src={post.author_avatar} alt={post.author_name} width={42} height={42} style={{ width: 42, height: 42, borderRadius: 999, objectFit: "cover" }} />
          ) : (
            <span style={{ width: 42, height: 42, borderRadius: 999, background: colors.tintBlueDeep, color: colors.brandDeep, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, textTransform: "uppercase" }}>{initials(post.author_name)}</span>
          )}
        </Link>
        <div>
          <Link href={`/scholars/${post.author_id}`} style={{ fontSize: 15, fontWeight: 700, color: colors.ink }}>{post.author_name}</Link>
          <div style={{ fontSize: 13, color: colors.inkFaint }}>{fmtDate(post.created_at)}</div>
        </div>
      </div>

      {/* Summary */}
      <div style={{ fontSize: 16, color: colors.ink, lineHeight: 1.75, whiteSpace: "pre-wrap", marginBottom: 22 }}>{post.summary}</div>

      {/* Links / file */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        {post.link_url && (
          <a href={safeUrl(post.link_url)} target="_blank" rel="noreferrer" style={ghostLink()}><Icon name="link" size={16} /> Open link</a>
        )}
        {post.file_url && fileUrl && (
          <a href={safeUrl(fileUrl)} target="_blank" rel="noreferrer" style={ghostLink()}><Icon name="fileText" size={16} /> Download file</a>
        )}
      </div>

      {/* Collaborate */}
      {post.seeking_collaborators && !isOwner && (
        <div style={{ background: "#fff", border: `1px solid ${colors.borderBlue}`, borderRadius: radius.lg, padding: "18px 20px", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
          <div style={{ fontSize: 14, color: colors.inkMuted, lineHeight: 1.5, maxWidth: 440 }}>
            Interested in working on this? Flag your interest and {post.author_name.split(/\s+/)[0]} can reach out.
          </div>
          <ResearchCollabButton postId={post.id} initialInterested={post.i_collaborate} count={post.collab_count} />
        </div>
      )}

      {/* Owner: interested collaborators */}
      {isOwner && post.seeking_collaborators && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: colors.ink, margin: "0 0 12px" }}>
            Interested collaborators{collaborators.length > 0 ? ` (${collaborators.length})` : ""}
          </h2>
          {collaborators.length === 0 ? (
            <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "22px", textAlign: "center", color: colors.inkFaint, fontSize: 14 }}>
              No one has flagged interest yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {collaborators.map((c) => (
                <div key={c.profile_id} style={{ display: "flex", alignItems: "center", gap: 12, background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "12px 16px" }}>
                  <Link href={`/scholars/${c.profile_id}`}>
                    {c.avatar_url ? (
                      <Image src={c.avatar_url} alt={c.full_name} width={38} height={38} style={{ width: 38, height: 38, borderRadius: 999, objectFit: "cover" }} />
                    ) : (
                      <span style={{ width: 38, height: 38, borderRadius: 999, background: colors.tintBlueDeep, color: colors.brandDeep, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, textTransform: "uppercase" }}>{initials(c.full_name)}</span>
                    )}
                  </Link>
                  <Link href={`/scholars/${c.profile_id}`} style={{ flex: 1, fontSize: 14.5, fontWeight: 700, color: colors.ink }}>{c.full_name}</Link>
                  <form action={startConversation.bind(null, c.profile_id)}>
                    <button type="submit" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: colors.tintBlue, color: colors.brandDeep, border: `1.5px solid ${colors.borderBlue}`, borderRadius: radius.pill, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                      <Icon name="chat" size={14} /> Message
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Owner controls */}
      {isOwner && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", paddingTop: 20, borderTop: `1px solid ${colors.border}` }}>
          <Link href={`/research/${post.id}/edit`} style={{ background: colors.tintBlue, color: colors.brandDeep, border: `1.5px solid ${colors.borderBlue}`, borderRadius: radius.pill, padding: "8px 18px", fontSize: 13, fontWeight: 700 }}>Edit</Link>
          <ResearchDeleteButton postId={post.id} />
        </div>
      )}
    </div>
  );
}

function ghostLink(): React.CSSProperties {
  return { display: "inline-flex", alignItems: "center", gap: 7, background: colors.brand, color: "#fff", borderRadius: radius.pill, padding: "10px 20px", fontSize: 14, fontWeight: 700, boxShadow: shadow.brand };
}
