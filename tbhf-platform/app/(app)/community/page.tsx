import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentUser, getMyRole } from "@/lib/profiles";
import { getMyCapabilities } from "@/lib/admin";
import { listCommunities } from "@/lib/communities";
import { Icon } from "@/components/Icon";
import { colors, radius, shadow } from "@/lib/theme";

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const role = await getMyRole();
  // Only full admins may CREATE a community (moderators curate existing ones).
  const canCreate = role === "admin";

  const { q } = await searchParams;
  // Capabilities and the community list are independent — one round trip, not two.
  // Moderators with the communities capability curate communities like admins.
  const [caps, communities] = await Promise.all([
    role === "admin" ? Promise.resolve([]) : getMyCapabilities(),
    listCommunities(q),
  ]);
  const isAdmin = role === "admin" || caps.includes("manage_communities");

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "32px", width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 6 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: colors.ink, margin: 0 }}>Communities</h1>
        {canCreate && (
          <Link href="/community/new" style={{ display: "inline-flex", alignItems: "center", gap: 7, background: colors.brand, color: "#fff", borderRadius: radius.pill, padding: "10px 20px", fontSize: 14.5, fontWeight: 700, boxShadow: shadow.brand }}>
            <Icon name="plus" size={16} /> Create community
          </Link>
        )}
      </div>
      <p style={{ fontSize: 14.5, color: colors.inkFaint, margin: "0 0 22px" }}>
        {isAdmin
          ? "Spaces you curate. Create communities and add students and alumni to them."
          : "The spaces an admin has added you to. Share posts and see what your community is publishing."}
      </p>

      {isAdmin && (
        <form action="/community" method="get" style={{ marginBottom: 22, maxWidth: 460 }}>
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search communities…"
            style={{ width: "100%", padding: "12px 16px", fontSize: 14.5, color: colors.ink, background: "#fff", border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.pill, outline: "none" }}
          />
        </form>
      )}

      {communities.length === 0 ? (
        <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "48px 26px", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", color: colors.inkFaint }}><Icon name="users" size={30} /></div>
          {isAdmin ? (
            <>
              <div style={{ fontSize: 16, fontWeight: 700, color: colors.ink, marginTop: 12 }}>
                {q ? `No communities match “${q}”.` : "No communities yet"}
              </div>
              {!q && canCreate && (
                <div style={{ fontSize: 14, color: colors.inkFaint, marginTop: 6 }}>
                  <Link href="/community/new" style={{ color: colors.brand, fontWeight: 600 }}>Create the first community</Link>.
                </div>
              )}
            </>
          ) : (
            <>
              <div style={{ fontSize: 16, fontWeight: 700, color: colors.ink, marginTop: 12 }}>You're not in any communities yet</div>
              <div style={{ fontSize: 14, color: colors.inkFaint, marginTop: 6, maxWidth: 420, marginInline: "auto", lineHeight: 1.55 }}>
                Communities are curated by the TBHF team. Once an admin adds you to one, it will show up here.
              </div>
            </>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {communities.map((c) => {
            const accent = c.accent || colors.brand;
            return (
              <Link key={c.id} href={`/community/${c.id}`} style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                {c.cover_url ? (
                  <div style={{ position: "relative", height: 72 }}>
                    <Image src={c.cover_url} alt="" fill style={{ objectFit: "cover" }} />
                  </div>
                ) : (
                  <div style={{ height: 8, background: accent }} />
                )}
                <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                    <div style={{ position: "relative", width: 42, height: 42, borderRadius: 12, background: accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, flexShrink: 0, textTransform: "uppercase", overflow: "hidden" }}>
                      {c.logo_url ? <Image src={c.logo_url} alt="" fill style={{ objectFit: "cover" }} /> : (c.name.trim()[0] ?? "C")}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: colors.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
                      <div style={{ fontSize: 12.5, color: colors.inkFaint }}>
                        {c.member_count} {c.member_count === 1 ? "member" : "members"} · {c.post_count} {c.post_count === 1 ? "post" : "posts"}
                      </div>
                    </div>
                  </div>
                  {c.description && (
                    <div style={{ fontSize: 13.5, color: colors.inkMuted, marginTop: 12, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {c.description}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
