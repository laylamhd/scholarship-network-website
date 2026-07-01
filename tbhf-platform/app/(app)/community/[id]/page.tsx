import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/profiles";
import {
  getCommunity,
  getCommunityFeed,
  getCommunityMemberContent,
  type FeedSort,
  type MemberContentItem,
} from "@/lib/communities";
import { notificationLink } from "@/lib/notificationLink";
import { Icon } from "@/components/Icon";
import CommunityPostComposer from "@/components/CommunityPostComposer";
import CommunityPostCard from "@/components/CommunityPostCard";
import CommunityManageMembers from "@/components/CommunityManageMembers";
import CommunitySpotlightCard from "@/components/CommunitySpotlightCard";
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
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sort?: string; saved?: string }>;
}) {
  const { id } = await params;
  const { sort: sortParam, saved: savedParam } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const sort: FeedSort = sortParam === "top" ? "top" : "new";
  const savedOnly = savedParam === "1";

  const community = await getCommunity(id);
  // null = not a member and not an admin -> not visible.
  if (!community) notFound();

  const [feed, content] = await Promise.all([
    getCommunityFeed(id, sort, savedOnly),
    getCommunityMemberContent(id),
  ]);

  const accent = community.accent || colors.brand;
  const mentionMembers = community.members.map((m) => ({ id: m.id, full_name: m.full_name }));

  const base = `/community/${community.id}`;
  const savedQ = savedOnly ? "&saved=1" : "";
  const pill = (on: boolean): React.CSSProperties => ({
    fontSize: 13, fontWeight: 700, padding: "6px 14px", borderRadius: 999,
    color: on ? "#fff" : colors.inkMuted, background: on ? colors.brand : colors.bg,
    border: `1px solid ${on ? colors.brand : colors.border}`, textDecoration: "none",
  });

  const discussionPanel = (
    <>
      <CommunityPostComposer communityId={community.id} members={mentionMembers} canModerate={community.can_moderate} />

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <Link href={`${base}?sort=new${savedQ}`} style={pill(sort === "new")}>Newest</Link>
        <Link href={`${base}?sort=top${savedQ}`} style={pill(sort === "top")}>Top</Link>
        <Link href={`${base}?sort=${sort}${savedOnly ? "" : "&saved=1"}`} style={{ ...pill(savedOnly), marginInlineStart: "auto", display: "inline-flex", alignItems: "center", gap: 5 }}>
          <Icon name="bookmark" size={14} /> Saved
        </Link>
      </div>

      {feed.length === 0 ? (
        <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "40px 26px", textAlign: "center", color: colors.inkFaint, fontSize: 14 }}>
          {savedOnly ? "You haven't saved any posts in this community yet." : "No posts yet — start the conversation."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {feed.map((p) => (
            <CommunityPostCard
              key={p.id}
              post={p}
              communityId={community.id}
              members={mentionMembers}
              canModerate={community.can_moderate}
              currentUserId={user.id}
            />
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
        <div style={{ position: "relative", height: 100, background: community.cover_url ? colors.bg : accent }}>
          {community.cover_url && <Image src={community.cover_url} alt="" fill style={{ objectFit: "cover" }} />}
        </div>
        <div style={{ padding: "0 26px 22px" }}>
          {/* logo overlaps the bar, on its own line so the title never touches the bar */}
          <div style={{ marginTop: -40 }}>
            <div style={{ position: "relative", width: 80, height: 80, borderRadius: 20, background: accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 800, border: "4px solid #fff", flexShrink: 0, textTransform: "uppercase", overflow: "hidden" }}>
              {community.logo_url ? <Image src={community.logo_url} alt="" fill style={{ objectFit: "cover" }} /> : (community.name.trim()[0] ?? "C")}
            </div>
          </div>

          <div style={{ marginTop: 14, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ minWidth: 0 }}>
              <h1 style={{ fontSize: 25, fontWeight: 700, color: colors.ink, margin: 0 }}>{community.name}</h1>
              <div style={{ fontSize: 13.5, color: colors.inkFaint, marginTop: 4 }}>
                {community.member_count} {community.member_count === 1 ? "member" : "members"} · {community.post_count} {community.post_count === 1 ? "post" : "posts"}
              </div>
            </div>
            {community.can_delete && (
              <DeleteCommunityButton communityId={community.id} name={community.name} />
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

          <CommunitySpotlightCard
            communityId={community.id}
            spotlight={community.spotlight}
            canModerate={community.can_moderate}
            members={community.members}
          />

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
