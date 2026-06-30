import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getMyRole } from "@/lib/profiles";
import { listOpportunities, getOpportunityTypeCounts } from "@/lib/opportunities";
import OpportunityActions from "@/components/OpportunityActions";
import { Icon, type IconName } from "@/components/Icon";
import { colors, radius, shadow } from "@/lib/theme";

const SERVICES: { label: string; icon: IconName }[] = [
  { label: "Resume review", icon: "fileText" },
  { label: "Career coaching", icon: "compass" },
  { label: "Mock interviews", icon: "mic" },
  { label: "Employer webinars", icon: "monitor" },
];

function iconForType(label: string): IconName {
  const l = label.toLowerCase();
  if (l.includes("intern")) return "briefcase";
  if (l.includes("graduate") || l.includes("trainee")) return "cap";
  if (l.includes("research") || l.includes("assistant")) return "flask";
  if (l.includes("fellow")) return "award";
  if (l.includes("volunteer")) return "heart";
  if (l.includes("job") || l.includes("vacanc")) return "building";
  return "briefcase";
}

function fmtDeadline(d: string | null): { text: string; soon: boolean } | null {
  if (!d) return null;
  const date = new Date(d);
  const days = Math.ceil((date.getTime() - Date.now()) / 86400000);
  const text = date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return { text, soon: days >= 0 && days <= 7 };
}

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; saved?: string; applied?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { q, type, saved, applied } = await searchParams;
  const savedOnly = saved === "1";
  const appliedOnly = applied === "1";
  const browsing = !type && !savedOnly && !appliedOnly && !q?.trim();

  const [role, typeCounts] = await Promise.all([getMyRole(), getOpportunityTypeCounts()]);
  const isAdmin = role === "admin";

  const opportunities = browsing
    ? []
    : await listOpportunities({ userId: user.id, search: q, type, savedOnly, appliedOnly });

  const heading = savedOnly ? "Saved opportunities" : appliedOnly ? "Applications" : type || (q ? `Results for “${q}”` : "All opportunities");

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px", width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 6 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: colors.ink, margin: 0 }}>Career Center</h1>
        {isAdmin && (
          <Link href="/opportunities/new" style={{ background: colors.brand, color: "#fff", borderRadius: radius.pill, padding: "10px 20px", fontSize: 14.5, fontWeight: 700, boxShadow: shadow.brand }}>
            + Post opportunity
          </Link>
        )}
      </div>
      <p style={{ fontSize: 14.5, color: colors.inkFaint, margin: "0 0 22px" }}>
        Internships, fellowships, graduate programs and jobs for TBHF scholars.
      </p>

      {/* Search */}
      <form action="/opportunities" method="get" style={{ marginBottom: 24, maxWidth: 460 }}>
        <input name="q" defaultValue={q ?? ""} placeholder="Search opportunities…" style={{ width: "100%", padding: "12px 16px", fontSize: 14.5, color: colors.ink, background: "#fff", border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.pill, outline: "none" }} />
      </form>

      {browsing ? (
        /* ---------- Browse by type (cards) ---------- */
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
            {typeCounts.map((t) => (
              <Link key={t.type} href={`/opportunities?type=${encodeURIComponent(t.type)}`} className="card" style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "20px", display: "block" }}>
                <div style={{ width: 46, height: 46, borderRadius: 13, background: colors.tintBlue, color: colors.brandDeep, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name={iconForType(t.type)} size={24} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: colors.ink, marginTop: 13, textTransform: "capitalize" }}>{t.type}</div>
                <div style={{ fontSize: 12.5, color: colors.brandDeep, fontWeight: 700, marginTop: 8 }}>
                  {t.count} {t.count === 1 ? "opening" : "openings"} →
                </div>
              </Link>
            ))}
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
            <Link href="/opportunities?saved=1" style={pillLink()}><Icon name="bookmark" size={15} /> Saved</Link>
            <Link href="/opportunities?applied=1" style={pillLink()}><Icon name="check" size={15} /> My applications</Link>
          </div>
        </>
      ) : (
        /* ---------- Filtered list ---------- */
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
            <h2 style={{ fontSize: 19, fontWeight: 700, color: colors.ink, margin: 0, textTransform: "capitalize" }}>{heading}</h2>
            <Link href="/opportunities" style={{ fontSize: 13.5, color: colors.brand, fontWeight: 600 }}>‹ All types</Link>
          </div>

          {opportunities.length === 0 ? (
            <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "40px", textAlign: "center", color: colors.inkFaint, fontSize: 14.5 }}>
              {savedOnly ? "You haven’t saved any opportunities yet." : appliedOnly ? "You haven’t marked any as applied yet." : "No opportunities here yet."}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {opportunities.map((o) => {
                const dl = fmtDeadline(o.deadline);
                const closed = o.status && o.status !== "open";
                return (
                  <div key={o.id} style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "20px 22px" }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: colors.brandDeep, background: colors.tintBlue, padding: "3px 10px", borderRadius: radius.pill, textTransform: "capitalize" }}>
                        <Icon name={iconForType(o.opportunity_type)} size={13} /> {o.opportunity_type}
                      </span>
                      {o.is_remote && <span style={{ fontSize: 11, fontWeight: 700, color: colors.inkMuted, background: colors.bg, padding: "3px 10px", borderRadius: radius.pill }}>Remote</span>}
                      {closed && <span style={{ fontSize: 11, fontWeight: 700, color: "#8A6D3B", background: "#FBF0E6", padding: "3px 10px", borderRadius: radius.pill, textTransform: "capitalize" }}>{o.status}</span>}
                    </div>

                    <div style={{ fontSize: 18, fontWeight: 700, color: colors.ink, marginTop: 12 }}>{o.title}</div>
                    <div style={{ fontSize: 14, color: colors.inkMuted, marginTop: 2 }}>
                      {o.company_name}{o.location ? ` · ${o.location}` : ""}
                    </div>

                    <div style={{ fontSize: 14, color: colors.inkMuted, marginTop: 10, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{o.description}</div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
                      {dl ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: dl.soon ? "#C0392B" : colors.inkFaint }}>
                          <Icon name="clock" size={15} /> Deadline: {dl.text}{dl.soon ? " (soon)" : ""}
                        </span>
                      ) : <span />}
                      <OpportunityActions opportunityId={o.id} applicationLink={o.application_link} initialBookmarked={o.bookmarked} initialApplied={o.applied} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Career services (coming soon) */}
      {browsing && (
        <div style={{ marginTop: 36 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: colors.ink, marginBottom: 4 }}>Career services</div>
          <div style={{ fontSize: 13.5, color: colors.inkFaint, marginBottom: 14 }}>One-to-one support to help you land the role — coming soon.</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            {SERVICES.map((s) => (
              <div key={s.label} style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "18px", opacity: 0.8 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ width: 40, height: 40, borderRadius: 11, background: colors.bg, color: colors.inkMuted, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name={s.icon} size={21} /></span>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: colors.inkFaint, background: colors.bg, padding: "3px 9px", borderRadius: radius.pill }}>SOON</span>
                </div>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: colors.ink, marginTop: 12 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function pillLink(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    background: colors.tintBlue,
    color: colors.brandDeep,
    border: `1.5px solid ${colors.borderBlue}`,
    borderRadius: radius.pill,
    padding: "10px 18px",
    fontSize: 14,
    fontWeight: 700,
  };
}
