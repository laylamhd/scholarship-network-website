import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, getMyRole } from "@/lib/profiles";
import { getShowcaseItem } from "@/lib/showcase";
import { isImageType, showcaseTypeIcon, toEmbedUrl, isPdf } from "@/lib/showcaseTypes";
import ShowcaseDeleteButton from "@/components/ShowcaseDeleteButton";
import { Icon } from "@/components/Icon";
import { colors, radius, shadow } from "@/lib/theme";

function initials(name: string): string {
  const p = name.trim().split(/\s+/);
  return (p[0]?.[0] ?? "") + (p[1]?.[0] ?? "");
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default async function ShowcaseItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [item, role] = await Promise.all([getShowcaseItem(id), getMyRole()]);
  if (!item) notFound();
  const isAdmin = role === "admin";

  const embed = item.media_type === "Video" ? toEmbedUrl(item.external_url) : null;
  const image = isImageType(item.media_type) ? item.media_url : null;

  return (
    <div style={{ maxWidth: 940, margin: "0 auto", padding: "32px", width: "100%" }}>
      <Link href="/showcase" style={{ fontSize: 13.5, color: colors.brand, fontWeight: 600 }}>‹ All media</Link>

      {item.review_status !== "approved" && (
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", background: item.review_status === "rejected" ? "#FDEDEC" : "#FBF6E9", border: `1px solid ${item.review_status === "rejected" ? "#F5C6C0" : "#EBD9A8"}`, color: item.review_status === "rejected" ? "#A33" : "#8A6D3B", padding: "12px 15px", borderRadius: radius.md, margin: "16px 0 0", fontSize: 13.5, lineHeight: 1.5 }}>
          <span style={{ flexShrink: 0, marginTop: 1 }}><Icon name="clock" size={17} /></span>
          {item.review_status === "rejected"
            ? "This submission was not approved by an admin, so it isn't visible in the gallery."
            : "This submission is awaiting admin approval. Only you and admins can see it until it's approved."}
        </div>
      )}

      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: colors.brandDeep, background: colors.tintBlue, padding: "4px 12px", borderRadius: radius.pill, margin: "16px 0 12px" }}>
        <Icon name={showcaseTypeIcon(item.media_type)} size={14} /> {item.media_type}
      </div>

      <h1 style={{ fontSize: 28, fontWeight: 800, color: colors.ink, margin: "0 0 18px", lineHeight: 1.2 }}>{item.title}</h1>

      {/* Media viewer */}
      <div style={{ borderRadius: radius.lg, overflow: "hidden", background: "#000", boxShadow: shadow.card, marginBottom: 22 }}>
        {image ? (
          // Original size — no cropping.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={item.title} style={{ display: "block", width: "100%", height: "auto", background: colors.bg }} />
        ) : embed ? (
          <div style={{ position: "relative", width: "100%", paddingTop: "56.25%" }}>
            <iframe src={embed} title={item.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }} />
          </div>
        ) : item.media_type === "Video" && item.media_url ? (
          <video controls poster={item.thumbnail_url ?? undefined} style={{ width: "100%", maxHeight: 540, display: "block", background: "#000" }}>
            <source src={item.media_url} />
          </video>
        ) : item.media_type === "Presentation" && item.media_url && isPdf(item.media_url) ? (
          /* PDF presentation: show the document inline (first page onward). */
          <iframe src={`${item.media_url}#view=FitH`} title={item.title} style={{ width: "100%", height: 560, border: 0, background: "#fff", display: "block" }} />
        ) : item.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.thumbnail_url} alt={item.title} style={{ display: "block", width: "100%", height: "auto", background: colors.bg }} />
        ) : (
          <div style={{ background: colors.bg, color: colors.brandDeep, opacity: 0.5, display: "flex", justifyContent: "center", padding: "60px 0" }}>
            <Icon name={showcaseTypeIcon(item.media_type)} size={64} />
          </div>
        )}
      </div>

      {/* Open original / external link */}
      {(item.media_url || item.external_url) && !image && (
        <a href={item.external_url || item.media_url || "#"} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 7, background: colors.brand, color: "#fff", borderRadius: radius.pill, padding: "10px 20px", fontSize: 14, fontWeight: 700, boxShadow: shadow.brand, marginBottom: 22 }}>
          Open {item.media_type === "Presentation" ? "presentation" : "original"} <Icon name="externalLink" size={15} />
        </a>
      )}

      {item.description && (
        <p style={{ fontSize: 16, color: colors.ink, lineHeight: 1.7, whiteSpace: "pre-wrap", margin: "0 0 24px" }}>{item.description}</p>
      )}

      {/* Footer: uploader + admin controls */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", paddingTop: 20, borderTop: `1px solid ${colors.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {item.uploader_avatar ? (
            <Image src={item.uploader_avatar} alt={item.uploader_name} width={36} height={36} style={{ width: 36, height: 36, borderRadius: 999, objectFit: "cover" }} />
          ) : (
            <span style={{ width: 36, height: 36, borderRadius: 999, background: colors.tintBlueDeep, color: colors.brandDeep, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, textTransform: "uppercase" }}>{initials(item.uploader_name)}</span>
          )}
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: colors.ink }}>{item.uploader_name}</div>
            <div style={{ fontSize: 12.5, color: colors.inkFaint }}>Added {fmtDate(item.created_at)}</div>
          </div>
        </div>
        {isAdmin && <ShowcaseDeleteButton itemId={item.id} />}
      </div>
    </div>
  );
}
