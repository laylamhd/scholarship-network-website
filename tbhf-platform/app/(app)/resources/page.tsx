import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getMyRole } from "@/lib/profiles";
import { getMyCapabilities } from "@/lib/admin";
import { listCategoriesWithCounts, listResources } from "@/lib/resources";
import BookmarkButton from "@/components/BookmarkButton";
import { Icon } from "@/components/Icon";
import { colors, radius, shadow } from "@/lib/theme";

// Line-style icons in the brand blue, echoing the logo's delicate strokes.
const CATEGORY_ICON: Record<string, React.ReactNode> = {
  Academic: (
    <>
      <path d="M2.5 8.5 12 4.2l9.5 4.3L12 12.8z" />
      <path d="M6.2 10.6V15c0 1.5 2.6 2.7 5.8 2.7s5.8-1.2 5.8-2.7v-4.4" />
      <path d="M21.5 8.7V14" />
    </>
  ),
  Career: (
    <>
      <rect x="3" y="7.5" width="18" height="12" rx="2.2" />
      <path d="M8.5 7.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5" />
      <path d="M3 12.4h18" />
    </>
  ),
  "Personal Development": (
    <>
      <path d="M12 20.5v-7.5" />
      <path d="M12 13.2c0-3.2 2.5-5.3 6.2-5.3.1 3.6-2.5 5.8-6.2 5.8z" />
      <path d="M12 14.4c0-2.7-2.2-4.6-5.6-4.6-.1 3.1 2.2 5.1 5.6 5.1z" />
    </>
  ),
  "Humanitarian Learning": (
    <>
      <path d="M12 20.4 4.3 12.6a4.6 4.6 0 0 1 6.5-6.5l1.2 1.2 1.2-1.2a4.6 4.6 0 0 1 6.5 6.5z" />
    </>
  ),
};

function CategoryIcon({ name }: { name: string }) {
  const paths = CATEGORY_ICON[name];
  return (
    <div style={{ width: 48, height: 48, borderRadius: 14, background: colors.tintBlue, display: "flex", alignItems: "center", justifyContent: "center", color: colors.brandDeep }}>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {paths ?? <circle cx="12" cy="12" r="8" />}
      </svg>
    </div>
  );
}

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string; saved?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { q, cat, saved } = await searchParams;
  const savedOnly = saved === "1";
  const browsing = !cat && !savedOnly && !q?.trim();

  const [role, categories] = await Promise.all([getMyRole(), listCategoriesWithCounts()]);
  // Moderators with the events/resources capability manage the library too.
  const caps = role === "admin" ? [] : await getMyCapabilities();
  const isAdmin = role === "admin" || caps.includes("manage_events_resources");

  // Only query resources when a category / saved / search is active.
  const resources = browsing
    ? []
    : await listResources({ userId: user.id, search: q, categoryId: cat, savedOnly });

  const activeCategory = cat ? categories.find((c) => c.id === cat) : null;
  const heading = savedOnly
    ? "Saved resources"
    : activeCategory
      ? activeCategory.name
      : q
        ? `Results for “${q}”`
        : "All resources";

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px", width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 6 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: colors.ink, margin: 0 }}>Resource Library</h1>
        {isAdmin && (
          <Link href="/resources/new" style={{ background: colors.brand, color: "#fff", borderRadius: radius.pill, padding: "10px 20px", fontSize: 14.5, fontWeight: 700, boxShadow: shadow.brand }}>
            + Add resource
          </Link>
        )}
      </div>

      {/* Search */}
      <form action="/resources" method="get" style={{ marginBottom: 24, maxWidth: 460 }}>
        <input name="q" defaultValue={q ?? ""} placeholder="Search resources…" style={{ width: "100%", padding: "12px 16px", fontSize: 14.5, color: colors.ink, background: "#fff", border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.pill, outline: "none" }} />
      </form>

      {browsing ? (
        /* ---------- Browse by category ---------- */
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
            {categories.map((c) => (
              <Link key={c.id} href={`/resources?cat=${c.id}`} className="card" style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "22px", display: "block" }}>
                <CategoryIcon name={c.name} />
                <div style={{ fontSize: 17, fontWeight: 700, color: colors.ink, marginTop: 14 }}>{c.name}</div>
                {c.description && <div style={{ fontSize: 13.5, color: colors.inkMuted, marginTop: 6, lineHeight: 1.5 }}>{c.description}</div>}
                <div style={{ fontSize: 12.5, color: colors.brandDeep, fontWeight: 700, marginTop: 14 }}>
                  {c.count} {c.count === 1 ? "resource" : "resources"} →
                </div>
              </Link>
            ))}
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
            <Link href="/resources?saved=1" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: colors.tintBlue, color: colors.brandDeep, border: `1.5px solid ${colors.borderBlue}`, borderRadius: radius.pill, padding: "10px 18px", fontSize: 14, fontWeight: 700 }}>
              <Icon name="bookmark" size={15} /> My saved resources
            </Link>
          </div>
        </>
      ) : (
        /* ---------- Filtered resource list ---------- */
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
            <h2 style={{ fontSize: 19, fontWeight: 700, color: colors.ink, margin: 0 }}>{heading}</h2>
            <Link href="/resources" style={{ fontSize: 13.5, color: colors.brand, fontWeight: 600 }}>‹ All categories</Link>
          </div>

          {resources.length === 0 ? (
            <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "40px", textAlign: "center", color: colors.inkFaint, fontSize: 14.5 }}>
              {savedOnly ? "You haven’t saved any resources yet." : "No resources here yet."}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
              {resources.map((r) => {
                const href = r.external_link || r.file_url || undefined;
                return (
                  <div key={r.id} style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "20px", display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {r.category_name && <span style={{ fontSize: 11, fontWeight: 700, color: colors.brandDeep, background: colors.tintBlue, padding: "3px 10px", borderRadius: radius.pill }}>{r.category_name}</span>}
                      <span style={{ fontSize: 11, fontWeight: 700, color: colors.inkFaint, background: colors.bg, padding: "3px 10px", borderRadius: radius.pill, textTransform: "uppercase" }}>{r.resource_type}</span>
                    </div>
                    <div style={{ fontSize: 16.5, fontWeight: 700, color: colors.ink, marginTop: 12 }}>{r.title}</div>
                    {r.description && (
                      <div style={{ fontSize: 13.5, color: colors.inkMuted, marginTop: 6, lineHeight: 1.5, flex: 1, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{r.description}</div>
                    )}
                    <div style={{ display: "flex", gap: 10, marginTop: 16, alignItems: "center" }}>
                      {href ? (
                        <a href={href} target="_blank" rel="noreferrer" style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, background: colors.brand, color: "#fff", borderRadius: radius.pill, padding: "9px 16px", fontSize: 13.5, fontWeight: 700, boxShadow: shadow.brand }}>Open <Icon name="externalLink" size={14} /></a>
                      ) : (
                        <span style={{ flex: 1, textAlign: "center", color: colors.inkFaint, fontSize: 13 }}>No link</span>
                      )}
                      <BookmarkButton resourceId={r.id} initialBookmarked={r.bookmarked} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
