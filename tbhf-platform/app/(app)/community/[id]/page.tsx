import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/profiles";
import {
  getCommunity,
  getCommunityFeed,
  getCommunityMemberContent,
  type MemberContentItem,
} from "@/lib/communities";
import { notificationLink } from "@/lib/notificationLink";
import { Icon } from "@/components/Icon";
import CommunityPostComposer from "@/components/CommunityPostComposer";
import CommunityPostCard from "@/components/CommunityPostCard";
import CommunityManageMembers from "@/components/CommunityManageMembers";
import CommunityTabs from "@/components/CommunityTabs";
import DeleteCommunityButton from "@/components/DeleteCommunityButton";
import { colors, radius } from "@/lib/theme";

function initials(name: string): string {
  const p = name.trim().split(/\s+/);
  return (p[0]?.[0] ?? "") + (p[1]?.[0] ?? "");
}

const CONTENT_LABEL: Record<string, string> = {
  stories: "Story",
  research_posts: "Research",
  showcase_items: "Showcase",
  community_projects: "Project",
  events: "Event",
  alumni_offers: "Offer",
};
const CONTENT_ICON: Record<string, string> = {
  stories: "fileText",
  research_posts: "flask",
  showcase_items: "image",
  community_projects: "handshake",
  events: "calendar",
  alumni_offers: "briefcase",
};

function ContentRow({ item }: { item: MemberContentItem }) {
  const href = notificationLink({ entity_type: item.entity_type, entity_id: item.id });
  const label = CONTENT_LABEL[item.entity_type] ?? "Post";
  const icon = CONTENT_ICON[item.entity_type] ?? "fileText";
  const inner = (
    <div style={{ display: "flex", alignItems: "center", gap: 14, background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "14px 18px" }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: colors.tintBlue, color: colors.brandDeep, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon name={icon} size={18} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: colors.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.title}</div>
        <div style={{ fontSize: 12.5, color: colors.inkFaint, marginTop: 2 }}>
          <span style={{ fontWeight: 700, color: colors.brandDeep }}>{label}</span> · by {item.author_name} · {new Date(item.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </div>
      </div>
      {href && <Icon name="externalLink" size={16} />}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export default async function CommunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const community = await getCommunity(id);
  // null = not a member and not an admin -> not visible.
  if (!community) notFound();

  const [feed, content] = await Promise.all([
    getCommunityFeed(id),
    getCommunityMemberContent(id),
  ]);

  const accent = community.accent || colors.brand;

  const discussionPanel = (
    <>
      <CommunityPostComposer communityId={community.id} />
      {feed.length === 0 ? (
        <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "40px 26px", textAlign: "center", color: colors.inkFaint, fontSize: 14 }}>
          No posts yet — start the conversation.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {feed.map((p) => (
            <CommunityPostCard key={p.id} post={p} communityId={community.id} canManage={community.is_admin} />
          ))}
        </div>
      )}
    </>
  );

  const contentPanel =
    content.length === 0 ? (
      <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "40px 26px", textAlign: "center", color: colors.inkFaint, fontSize: 14 }}>
        No published content from members yet.
      </div>
    ) : (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {content.map((item) => (
          <ContentRow key={`${item.entity_type}-${item.id}`} item={item} />
        ))}
      </div>
    );

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "32px", width: "100%" }}>
      <Link href="/community" style={{ fontSize: 14, color: colors.inkMuted, fontWeight: 600 }}>‹ Communities</Link>

      {/* Banner header */}
      <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, overflow: "hidden", marginTop: 12, marginBottom: 20 }}>
        <div style={{ height: 64, background: accent }} />
        <div style={{ padding: "0 26px 22px", marginTop: -26 }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 16, minWidth: 0 }}>
              <div style={{ width: 72, height: 72, borderRadius: 18, background: accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 800, border: "4px solid #fff", flexShrink: 0, textTransform: "uppercase" }}>
                {community.name.trim()[0] ?? "C"}
              </div>
              <div style={{ minWidth: 0, paddingBottom: 4 }}>
                <h1 style={{ fontSize: 25, fontWeight: 700, color: colors.ink, margin: 0 }}>{community.name}</h1>
                <div style={{ fontSize: 13.5, color: colors.inkFaint, marginTop: 3 }}>
                  {community.member_count} {community.member_count === 1 ? "member" : "members"} · {community.post_count} {community.post_count === 1 ? "post" : "posts"}
                </div>
              </div>
            </div>
            {community.can_delete && (
              <div style={{ paddingBottom: 4 }}>
                <DeleteCommunityButton communityId={community.id} name={community.name} />
              </div>
            )}
          </div>
          {community.description && (
            <div style={{ fontSize: 14.5, color: colors.inkMuted, lineHeight: 1.6, marginTop: 16, whiteSpace: "pre-wrap" }}>{community.description}</div>
          )}
        </div>
      </div>

      <div className="profile-grid" style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24, alignItems: "start" }}>
        {/* Main: tabs */}
        <CommunityTabs
          tabs={[
            { key: "discussion", label: "Discussion", count: community.post_count, panel: discussionPanel },
            { key: "content", label: "Content by community members", count: content.length, panel: contentPanel },
          ]}
        />

        {/* Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "20px 22px" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: colors.ink, marginBottom: 8 }}>About</div>
            <div style={{ fontSize: 13.5, color: colors.inkMuted, lineHeight: 1.55 }}>
              {community.description || "A private space for this community."}
            </div>
            <div style={{ borderTop: `1px solid ${colors.border}`, marginTop: 14, paddingTop: 14, fontSize: 12.5, color: colors.inkFaint }}>
              Created {new Date(community.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
            </div>
          </div>

          {community.is_admin ? (
            <CommunityManageMembers communityId={community.id} members={community.members} />
          ) : (
            <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "20px 22px" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: colors.ink, marginBottom: 14 }}>
                Members <span style={{ color: colors.inkFaint, fontWeight: 600 }}>· {community.member_count}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {community.members.map((m) => (
                  <Link key={m.id} href={`/scholars/${m.id}`} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {m.avatar_url ? (
                      <Image src={m.avatar_url} alt={m.full_name} width={36} height={36} style={{ width: 36, height: 36, borderRadius: 999, objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: 36, height: 36, borderRadius: 999, background: colors.tintBlueDeep, color: colors.brandDeep, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, textTransform: "uppercase" }}>
                        {initials(m.full_name)}
                      </div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: colors.ink }}>{m.full_name}</div>
                      <div style={{ fontSize: 12, color: colors.inkFaint, textTransform: "capitalize" }}>
                        {m.role === "scholar" ? "Student" : m.role}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`@media (max-width: 900px){ .profile-grid{ grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}
