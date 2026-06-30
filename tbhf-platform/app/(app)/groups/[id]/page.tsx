import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, getMyRole } from "@/lib/profiles";
import { getMyCapabilities } from "@/lib/admin";
import { getGroup, categoryLabel } from "@/lib/groups";
import { getGroupFeed } from "@/lib/feed";
import { Icon } from "@/components/Icon";
import GroupJoinButton from "@/components/GroupJoinButton";
import DeleteGroupButton from "@/components/DeleteGroupButton";
import PostComposer from "@/components/PostComposer";
import PostCard from "@/components/PostCard";
import { colors, radius } from "@/lib/theme";

function initials(name: string): string {
  const p = name.trim().split(/\s+/);
  return (p[0]?.[0] ?? "") + (p[1]?.[0] ?? "");
}

export default async function GroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const group = await getGroup(id);
  if (!group) notFound();

  // Admins and moderators with the communities capability can manage groups:
  // delete the group, delete posts, and read the feed without joining.
  const role = await getMyRole();
  const caps = role === "admin" ? [] : await getMyCapabilities();
  const canManage = role === "admin" || caps.includes("manage_communities");
  const canView = group.isMember || canManage;

  const feed = canView ? await getGroupFeed(id) : [];

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px", width: "100%" }}>
      <Link href="/groups" style={{ fontSize: 14, color: colors.inkMuted, fontWeight: 600 }}>‹ Groups</Link>

      {/* Header */}
      <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "24px 26px", marginTop: 12, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: colors.brandDeep, background: colors.tintBlue, padding: "4px 11px", borderRadius: radius.pill }}>
              {categoryLabel(group.category)}
            </span>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: colors.ink, margin: "12px 0 4px" }}>{group.name}</h1>
            <div style={{ fontSize: 13.5, color: colors.inkFaint }}>
              {group.memberCount} {group.memberCount === 1 ? "member" : "members"}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
            <div style={{ width: 160 }}>
              <GroupJoinButton groupId={group.id} initialMember={group.isMember} block />
            </div>
            {canManage && <DeleteGroupButton groupId={group.id} name={group.name} />}
          </div>
        </div>
        {group.description && (
          <div style={{ fontSize: 14.5, color: colors.inkMuted, lineHeight: 1.6, marginTop: 16, whiteSpace: "pre-wrap" }}>{group.description}</div>
        )}
      </div>

      <div className="profile-grid" style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24, alignItems: "start" }}>
        {/* Discussions */}
        <div>
          {canView ? (
            <>
              {group.isMember ? (
                <PostComposer groupId={group.id} />
              ) : (
                <div style={{ background: colors.tintBlue, border: `1px solid ${colors.borderBlue}`, borderRadius: radius.lg, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: colors.brandDeep, display: "flex", alignItems: "center", gap: 8 }}>
                  <Icon name="shield" size={15} /> You’re viewing this group as a moderator. Join to post.
                </div>
              )}
              {feed.length === 0 ? (
                <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "40px 26px", textAlign: "center", color: colors.inkFaint, fontSize: 14 }}>
                  No posts yet — start the conversation.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {feed.map((p) => (
                    <PostCard key={p.id} post={p} groupId={group.id} canManage={canManage} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "40px 26px", textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", color: colors.inkFaint }}><Icon name="chat" size={30} /></div>
              <div style={{ fontSize: 16, fontWeight: 700, color: colors.ink, marginTop: 10 }}>Members-only discussions</div>
              <div style={{ fontSize: 14, color: colors.inkFaint, marginTop: 6, maxWidth: 420, marginInline: "auto", lineHeight: 1.55 }}>
                Join this group to read and take part in the discussion.
              </div>
            </div>
          )}
        </div>

        {/* Members */}
        <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "20px 22px" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: colors.ink, marginBottom: 14 }}>Members</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {group.members.map((m) => (
              <Link key={m.profile_id} href={`/scholars/${m.profile_id}`} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {m.avatar_url ? (
                  <Image src={m.avatar_url} alt={m.full_name} width={40} height={40} style={{ width: 40, height: 40, borderRadius: 999, objectFit: "cover" }} />
                ) : (
                  <div style={{ width: 40, height: 40, borderRadius: 999, background: colors.tintBlueDeep, color: colors.brandDeep, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, textTransform: "uppercase" }}>
                    {initials(m.full_name)}
                  </div>
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: colors.ink }}>{m.full_name}</div>
                  <div style={{ fontSize: 12, color: colors.inkFaint, textTransform: "capitalize" }}>
                    {m.role === "admin" ? "Admin" : m.user_role === "scholar" ? "Student" : m.user_role}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <style>{`@media (max-width: 900px){ .profile-grid{ grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}
