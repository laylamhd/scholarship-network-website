import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/profiles";
import { listResearch, type ResearchCard } from "@/lib/research";
import { RESEARCH_KINDS, researchKindIcon, researchKindColor } from "@/lib/researchKinds";
import { getSurveysOverview } from "@/lib/surveys";
import ResearchSearch from "@/components/ResearchSearch";
import SurveyGrid from "@/components/SurveyGrid";
import { Icon } from "@/components/Icon";
import { colors, radius, shadow } from "@/lib/theme";

function initials(name: string): string {
  const p = name.trim().split(/\s+/);
  return (p[0]?.[0] ?? "") + (p[1]?.[0] ?? "");
}

/* ---------------- Google-style result row ---------------- */
function Result({ r }: { r: ResearchCard }) {
  const accent = researchKindColor(r.kind);
  return (
    <div className="gres-row" style={{ display: "flex", gap: 14, padding: "16px 0", borderBottom: `1px solid ${colors.border}` }}>
      {/* category "favicon" */}
      <span style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 999, background: `${accent}18`, color: accent, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 3 }}>
        <Icon name={researchKindIcon(r.kind)} size={18} />
      </span>

      <div style={{ minWidth: 0, flex: 1 }}>
        {/* meta line (the "url" line) */}
        <div style={{ fontSize: 12.5, color: colors.inkFaint, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 600, color: accent }}>{r.kind}</span>
          {r.field && <span>· {r.field}</span>}
          <span>· {r.author_name}</span>
        </div>

        {/* title */}
        <Link href={`/research/${r.id}`} className="gres-title" style={{ display: "inline-block", fontSize: 19, fontWeight: 500, lineHeight: 1.3, margin: "3px 0 4px" }}>
          {r.title}
        </Link>

        {/* snippet */}
        <p style={{ fontSize: 14, color: colors.inkMuted, lineHeight: 1.55, margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {r.summary}
        </p>

        {/* extras */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginTop: 8, fontSize: 12.5, color: colors.inkFaint }}>
          {r.seeking_collaborators && <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#0F8F6B", fontWeight: 700 }}><Icon name="users" size={13} /> Seeking collaborators</span>}
          {r.collab_count > 0 && <span>{r.collab_count} interested</span>}
          {r.link_url && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="link" size={13} /> Link</span>}
          {r.file_url && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="fileText" size={13} /> File</span>}
        </div>
      </div>

      {/* author avatar */}
      <Link href={`/scholars/${r.author_id}`} style={{ flexShrink: 0, marginTop: 3 }}>
        {r.author_avatar ? (
          <Image src={r.author_avatar} alt={r.author_name} width={30} height={30} style={{ width: 30, height: 30, borderRadius: 999, objectFit: "cover" }} />
        ) : (
          <span style={{ width: 30, height: 30, borderRadius: 999, background: colors.tintBlueDeep, color: colors.brandDeep, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>{initials(r.author_name)}</span>
        )}
      </Link>
    </div>
  );
}

export default async function ResearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; kind?: string; mine?: string; seeking?: string; view?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { q, kind, mine, seeking, view } = await searchParams;
  const mineOnly = mine === "1";
  const seekingOnly = seeking === "1";
  const surveysView = view === "surveys";

  const tabHref = (k?: string) => (k ? `/research?kind=${encodeURIComponent(k)}` : "/research");

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 28px 48px", width: "100%" }}>
      {/* Masthead */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 30, fontWeight: 800, color: colors.ink, margin: 0, letterSpacing: "-0.01em" }}>Research Hub</h1>
          <p style={{ fontSize: 14.5, color: colors.inkFaint, margin: "6px 0 0", maxWidth: 560, lineHeight: 1.5 }}>
            Publish research summaries, find collaborators and collect data with surveys.
          </p>
        </div>
        {surveysView ? (
          <Link href="/surveys/new" style={{ background: colors.brand, color: "#fff", borderRadius: radius.pill, padding: "11px 22px", fontSize: 14.5, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 7, boxShadow: shadow.brand }}>
            <Icon name="plus" size={17} /> New survey
          </Link>
        ) : (
          <Link href="/research/new" style={{ background: colors.brand, color: "#fff", borderRadius: radius.pill, padding: "11px 22px", fontSize: 14.5, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 7, boxShadow: shadow.brand }}>
            <Icon name="plus" size={17} /> Share research
          </Link>
        )}
      </div>

      {/* Tabs + search */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", borderBottom: `1px solid ${colors.border}`, marginBottom: 4 }}>
        <div style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
          <Link href={tabHref()} style={tab(!kind && !mineOnly && !seekingOnly && !surveysView)}>All</Link>
          {RESEARCH_KINDS.map((k) => (
            <Link key={k} href={tabHref(k)} style={tab(!surveysView && kind === k)}>{k}</Link>
          ))}
          <Link href="/research?view=surveys" style={tab(surveysView)}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="clipboard" size={15} /> Dataset Surveys</span>
          </Link>
        </div>
        {!surveysView && (
          <div style={{ paddingBottom: 8 }}>
            <ResearchSearch initialQuery={q ?? ""} />
          </div>
        )}
      </div>

      {surveysView ? (
        <SurveysSection userId={user.id} mineOnly={mineOnly} />
      ) : (
        <ResearchFeed userId={user.id} q={q} kind={kind} mineOnly={mineOnly} seekingOnly={seekingOnly} />
      )}
    </div>
  );
}

async function ResearchFeed({ userId, q, kind, mineOnly, seekingOnly }: { userId: string; q?: string; kind?: string; mineOnly: boolean; seekingOnly: boolean }) {
  const posts = await listResearch({ userId, kind, search: q, mineOnly, seekingOnly });

  const feedHeading = mineOnly ? "My contributions" : seekingOnly ? "Seeking collaborators" : kind ? kind : q ? `Results for “${q}”` : "Latest";

  return (
    <>
      {/* Secondary filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "16px 0 18px" }}>
        <Link href="/research?seeking=1" style={pill(seekingOnly)}><Icon name="users" size={14} /> Seeking collaborators</Link>
        <Link href="/research?mine=1" style={pill(mineOnly)}><Icon name="user" size={14} /> My contributions</Link>
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: colors.inkFaint, marginBottom: 4 }}>{feedHeading}</div>

      {posts.length === 0 ? (
        <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "46px", textAlign: "center", color: colors.inkFaint, fontSize: 14.5, marginTop: 14 }}>
          <div style={{ marginBottom: 14, opacity: 0.5, display: "flex", justifyContent: "center" }}><Icon name="flask" size={38} /></div>
          {mineOnly ? "You haven’t shared anything yet." : q ? `Nothing matches “${q}”.` : "Nothing here yet — be the first to share."}
        </div>
      ) : (
        <div style={{ maxWidth: 760 }}>
          {posts.map((r) => <Result key={r.id} r={r} />)}
        </div>
      )}
    </>
  );
}

async function SurveysSection({ userId, mineOnly }: { userId: string; mineOnly: boolean }) {
  const all = await getSurveysOverview();
  const surveys = mineOnly ? all.filter((s) => s.author_id === userId) : all;

  return (
    <>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "16px 0 18px" }}>
        <Link href="/research?view=surveys" style={pill(!mineOnly)}><Icon name="clipboard" size={14} /> All surveys</Link>
        <Link href="/research?view=surveys&mine=1" style={pill(mineOnly)}><Icon name="user" size={14} /> My surveys</Link>
      </div>

      <p style={{ fontSize: 13, color: colors.inkFaint, margin: "0 0 18px", maxWidth: 620, lineHeight: 1.5 }}>
        Build a survey to collect data from the community. Responses are anonymous.
      </p>

      <SurveyGrid surveys={surveys} userId={userId} emptyLabel={mineOnly ? "You haven’t created any surveys yet." : "No surveys yet — create the first one."} />
    </>
  );
}

function tab(active: boolean): React.CSSProperties {
  return {
    fontSize: 14.5, fontWeight: 700, paddingBottom: 9,
    color: active ? colors.ink : colors.inkFaint,
    borderBottom: `2.5px solid ${active ? colors.brand : "transparent"}`,
  };
}

function pill(active: boolean): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", gap: 6,
    background: active ? colors.brand : "#fff",
    color: active ? "#fff" : colors.inkMuted,
    border: `1.5px solid ${active ? colors.brand : colors.borderStrong}`,
    borderRadius: radius.pill, padding: "8px 15px", fontSize: 13, fontWeight: 600,
  };
}
