import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getMyRole } from "@/lib/profiles";
import { listShowcase, getShowcaseTypeCounts, type ShowcaseItem } from "@/lib/showcase";
import { SHOWCASE_TYPES, showcaseTypePlural, showcaseTypeIcon, isImageType, isPdf, PDF_COVER_HASH } from "@/lib/showcaseTypes";
import { Icon } from "@/components/Icon";
import { colors, radius, shadow, gradients } from "@/lib/theme";

// Deterministic varied heights for the masonry (so the grid feels Pinterest-like).
const PIN_HEIGHTS = [210, 260, 300, 350, 400];
function pinHeight(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i)) % 997;
  return PIN_HEIGHTS[h % PIN_HEIGHTS.length];
}

function PinCard({ item }: { item: ShowcaseItem }) {
  const thumb = isImageType(item.media_type) ? item.media_url : item.thumbnail_url;
  const placeholderHeight = pinHeight(item.id);
  // A PDF presentation with no thumbnail: render its first page inline as the cover.
  const pdfCover = !thumb && item.media_type === "Presentation" && isPdf(item.media_url) ? item.media_url : null;
  const fixedHeight = thumb ? undefined : { height: placeholderHeight };
  return (
    <div className="masonry-item">
      <Link href={`/showcase/${item.id}`} className="pin" style={fixedHeight}>
        {thumb ? (
          // Original aspect ratio — no cropping (true Pinterest masonry).
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt={item.title} style={{ display: "block", width: "100%", height: "auto" }} />
        ) : pdfCover ? (
          <iframe
            src={`${pdfCover}${PDF_COVER_HASH}`}
            title={item.title}
            tabIndex={-1}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0, pointerEvents: "none", background: "#fff" }}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: colors.brandDeep, opacity: 0.55 }}>
            <Icon name={showcaseTypeIcon(item.media_type)} size={52} />
          </div>
        )}

        {/* type badge */}
        <span style={{ position: "absolute", top: 10, left: 10, zIndex: 2, display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: colors.brandDeep, background: "rgba(255,255,255,.92)", padding: "4px 10px", borderRadius: radius.pill }}>
          <Icon name={showcaseTypeIcon(item.media_type)} size={12} /> {item.media_type}
        </span>

        {/* review status (author / admin only — others never receive these rows) */}
        {item.review_status !== "approved" && (
          <span style={{ position: "absolute", top: 10, right: 10, zIndex: 2, display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: item.review_status === "rejected" ? "#A33" : "#8A6D3B", background: item.review_status === "rejected" ? "rgba(253,237,236,.95)" : "rgba(251,246,233,.95)", padding: "4px 10px", borderRadius: radius.pill }}>
            <Icon name="clock" size={11} /> {item.review_status === "rejected" ? "Not approved" : "Pending"}
          </span>
        )}

        {/* play overlay for video */}
        {item.media_type === "Video" && (
          <span style={{ position: "absolute", inset: 0, zIndex: 2, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
            <span style={{ width: 54, height: 54, borderRadius: 999, background: "rgba(17,166,214,.92)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: shadow.brand }}>
              <Icon name="play" size={27} />
            </span>
          </span>
        )}

        {/* title scrim */}
        <span className="pin-scrim" />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 2, padding: "14px 15px" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", lineHeight: 1.3, textShadow: "0 1px 3px rgba(0,0,0,.35)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{item.title}</div>
        </div>
      </Link>
    </div>
  );
}

export default async function ShowcasePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; q?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { type, q } = await searchParams;
  const [role, items, counts] = await Promise.all([getMyRole(), listShowcase({ type, search: q }), getShowcaseTypeCounts()]);
  const isAdmin = role === "admin";
  const total = Array.from(counts.values()).reduce((a, b) => a + b, 0);

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px", width: "100%" }}>
      {/* Hero */}
      <div style={{ background: gradients.hero, borderRadius: radius.lg, padding: "28px 32px", color: "#fff", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ width: 52, height: 52, borderRadius: 15, background: "rgba(255,255,255,.18)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name="image" size={28} />
          </span>
          <div>
            <h1 style={{ fontSize: 27, fontWeight: 700, margin: 0 }}>Multimedia Showcase</h1>
            <p style={{ fontSize: 14.5, opacity: 0.92, margin: "4px 0 0", maxWidth: 560, lineHeight: 1.5 }}>
              Photos, videos, posters, artworks and presentations from across the TBHF community.
            </p>
          </div>
        </div>
        <Link href="/showcase/new" style={{ background: "#fff", color: colors.brandDeep, borderRadius: radius.pill, padding: "11px 22px", fontSize: 14.5, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 7 }}>
          <Icon name="image" size={17} /> {isAdmin ? "Add media" : "Submit media"}
        </Link>
      </div>

      {/* Search */}
      <form action="/showcase" method="get" style={{ marginBottom: 18, maxWidth: 460 }}>
        {type && <input type="hidden" name="type" value={type} />}
        <input name="q" defaultValue={q ?? ""} placeholder="Search the showcase…" style={{ width: "100%", padding: "12px 16px", fontSize: 14.5, color: colors.ink, background: "#fff", border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.pill, outline: "none" }} />
      </form>

      {/* Type filter chips */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 26 }}>
        <Link href={q ? `/showcase?q=${encodeURIComponent(q)}` : "/showcase"} style={chip(!type)}>All {total ? <span style={{ opacity: 0.7 }}>{total}</span> : null}</Link>
        {SHOWCASE_TYPES.map((t) => (
          <Link key={t} href={`/showcase?type=${encodeURIComponent(t)}${q ? `&q=${encodeURIComponent(q)}` : ""}`} style={chip(type === t)}>
            <Icon name={showcaseTypeIcon(t)} size={14} /> {showcaseTypePlural(t)}
            {counts.get(t) ? <span style={{ opacity: 0.7 }}>{counts.get(t)}</span> : null}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "48px", textAlign: "center", color: colors.inkFaint, fontSize: 14.5 }}>
          <div style={{ marginBottom: 14, opacity: 0.5, display: "flex", justifyContent: "center" }}><Icon name="image" size={40} /></div>
          {q ? `Nothing matches “${q}”.` : type ? `No ${showcaseTypePlural(type).toLowerCase()} yet.` : "The showcase is empty for now."}
          {isAdmin && !q && (
            <div style={{ marginTop: 14 }}><Link href="/showcase/new" style={{ color: colors.brand, fontWeight: 700 }}>Add the first item →</Link></div>
          )}
        </div>
      ) : (
        <div className="masonry">
          {items.map((item) => <PinCard key={item.id} item={item} />)}
        </div>
      )}
    </div>
  );
}

function chip(active: boolean): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", gap: 6,
    background: active ? colors.brand : "#fff",
    color: active ? "#fff" : colors.inkMuted,
    border: `1.5px solid ${active ? colors.brand : colors.borderStrong}`,
    borderRadius: radius.pill, padding: "8px 15px", fontSize: 13.5, fontWeight: 600,
  };
}
