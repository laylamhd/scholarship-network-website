import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/profiles";
import { listGroups, categoryLabel } from "@/lib/groups";
import GroupJoinButton from "@/components/GroupJoinButton";
import GroupCategoryFilter from "@/components/GroupCategoryFilter";
import { colors, radius, shadow } from "@/lib/theme";

export default async function GroupsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { q, cat } = await searchParams;
  const groups = await listGroups(q, cat);

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px", width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 6 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: colors.ink, margin: 0 }}>Groups</h1>
        <Link href="/groups/new" style={{ background: colors.brand, color: "#fff", borderRadius: radius.pill, padding: "10px 20px", fontSize: 14.5, fontWeight: 700, boxShadow: shadow.brand }}>
          + Create group
        </Link>
      </div>

      {/* Search + category filter */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 22 }}>
        <form action="/groups" method="get" style={{ flex: "1 1 280px", maxWidth: 420, display: "flex" }}>
          {cat && <input type="hidden" name="cat" value={cat} />}
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search groups…"
            style={{ width: "100%", padding: "12px 16px", fontSize: 14.5, color: colors.ink, background: "#fff", border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.pill, outline: "none" }}
          />
        </form>
        <GroupCategoryFilter selected={cat} query={q} />
      </div>

      {groups.length === 0 ? (
        <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "40px", textAlign: "center", color: colors.inkFaint, fontSize: 14.5 }}>
          No groups yet.{" "}
          <Link href="/groups/new" style={{ color: colors.brand, fontWeight: 600 }}>Create the first one</Link>.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {groups.map((g) => (
            <div key={g.id} style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "20px", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: colors.brandDeep, background: colors.tintBlue, padding: "3px 10px", borderRadius: radius.pill }}>
                  {categoryLabel(g.category)}
                </span>
                <span style={{ fontSize: 12.5, color: colors.inkFaint, fontWeight: 600 }}>
                  {g.member_count} {g.member_count === 1 ? "member" : "members"}
                </span>
              </div>
              <Link href={`/groups/${g.id}`} style={{ fontSize: 17, fontWeight: 700, color: colors.ink, marginTop: 12 }}>{g.name}</Link>
              {g.description && (
                <div style={{ fontSize: 13.5, color: colors.inkMuted, marginTop: 6, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {g.description}
                </div>
              )}
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <GroupJoinButton groupId={g.id} initialMember={g.is_member} size="sm" block />
                <Link href={`/groups/${g.id}`} style={{ flex: 1, textAlign: "center", background: "#fff", color: colors.ink, border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.pill, padding: "8px 16px", fontSize: 13, fontWeight: 600 }}>
                  View
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
