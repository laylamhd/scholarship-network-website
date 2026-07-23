"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import AdminMemberRow from "@/components/AdminMemberRow";
import AnnouncementsManager from "@/components/AnnouncementsManager";
import ContentModeration from "@/components/ContentModeration";
import AdminAdvancedSettings from "@/components/AdminAdvancedSettings";
import { Icon, type IconName } from "@/components/Icon";
import { colors, radius, gradients } from "@/lib/theme";
import type {
  AdminOverview, AdminDemographics, AdminEngagement, AdminMember, Announcement, Breakdown, PendingCounts,
} from "@/lib/admin";
import type { Moderator } from "@/lib/moderators";

type Tab = "overview" | "members" | "comms" | "advanced";

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: "overview", label: "Overview", icon: "monitor" },
  { id: "members", label: "Members", icon: "users" },
  { id: "comms", label: "Announcements", icon: "mail" },
  { id: "advanced", label: "Advanced settings", icon: "shield" },
];

export default function AdminDashboard({
  firstName, overview, demographics, engagement, members, announcements, pending, moderators, currentUserId,
}: {
  firstName: string;
  overview: AdminOverview | null;
  demographics: AdminDemographics | null;
  engagement: AdminEngagement | null;
  members: AdminMember[];
  announcements: Announcement[];
  pending: PendingCounts | null;
  moderators: Moderator[];
  currentUserId: string;
}) {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px", width: "100%" }}>
      {/* Hero */}
      <div style={{ background: gradients.hero, borderRadius: radius.lg, padding: "28px 32px", color: "#fff", marginBottom: 22, position: "relative", overflow: "hidden" }}>
        <svg viewBox="0 0 1200 200" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.16 }}>
          <path d="M0 120 C150 80 320 160 520 120 C740 76 920 162 1200 120" fill="none" stroke="#fff" strokeWidth="2.5" />
        </svg>
        <div style={{ position: "relative" }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, opacity: 0.9 }}>Administrator dashboard</div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>Welcome back, {firstName}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 24, borderBottom: `1px solid ${colors.border}`, paddingBottom: 2 }}>
        {TABS.map((t) => {
          const on = tab === t.id;
          return (
            <button key={t.id} type="button" onClick={() => setTab(t.id)} title={t.label} aria-label={t.label} style={{
              display: "inline-flex", alignItems: "center", gap: 8, border: 0, background: on ? colors.tintBlue : "transparent", cursor: "pointer",
              padding: "10px 16px", fontSize: 14, fontWeight: 700, color: on ? colors.brandDeep : colors.inkMuted,
              borderRadius: radius.pill, marginBottom: 2,
            }}>
              {/* Labels stay visible on every tab — icon-only nav hid what each did. */}
              <Icon name={t.icon} size={17} /><span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {tab === "overview" && <OverviewTab o={overview} d={demographics} e={engagement} pending={pending} onGoTab={setTab} />}
      {tab === "members" && <MembersTab members={members} currentUserId={currentUserId} />}
      {tab === "comms" && <AnnouncementsManager items={announcements} />}
      {tab === "advanced" && <AdminAdvancedSettings members={members} moderators={moderators} currentUserId={currentUserId} />}
    </div>
  );
}

/* ---------------- Overview (actions first, then stats + collapsible sections) ---------------- */
function OverviewTab({ o, d, e, pending, onGoTab }: {
  o: AdminOverview | null; d: AdminDemographics | null; e: AdminEngagement | null; pending: PendingCounts | null;
  onGoTab: (t: Tab) => void;
}) {
  const [demoOpen, setDemoOpen] = useState(false);
  const [engOpen, setEngOpen] = useState(false);
  // When set, the Engagement section opens with this entity's review panel
  // already showing (the key below remounts EngagementTab so it takes effect).
  const [focusReview, setFocusReview] = useState<{ entity: string; label: string } | null>(null);
  const engRef = useRef<HTMLDivElement>(null);

  const openReview = (target: { entity: string; label: string } | null) => {
    setFocusReview(target);
    setEngOpen(true);
    requestAnimationFrame(() => engRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* 1 — what needs doing right now */}
      <AttentionStrip pending={pending} onReview={openReview} />

      {/* 2 — the things an admin can do, as verbs */}
      <QuickActions onGoTab={onGoTab} />

      {/* 3 — the numbers (still here, no longer the headline) */}
      <Section title="Platform statistics" icon="monitor">
        <OverviewStats o={o} />
      </Section>

      {/* Demographics — collapsible */}
      <Section title="Demographics" icon="globe" open={demoOpen} onToggle={() => setDemoOpen((v) => !v)}>
        <DemographicsTab d={d} />
      </Section>

      {/* Engagement — collapsible */}
      <div ref={engRef}>
        <Section title="Engagement" icon="sparkle" open={engOpen} onToggle={() => setEngOpen((v) => !v)}>
          <EngagementTab key={focusReview?.entity ?? "none"} e={e} pending={pending} initialReview={focusReview} />
        </Section>
      </div>
    </div>
  );
}

/* The labels/icons for each reviewable content type (mirrors EngagementTab). */
const PENDING_TYPES: { entity: keyof PendingCounts; label: string; icon: IconName }[] = [
  { entity: "stories", label: "Stories", icon: "fileText" },
  { entity: "research_posts", label: "Research posts", icon: "flask" },
  { entity: "community_projects", label: "Community projects", icon: "heart" },
  { entity: "showcase_items", label: "Showcase items", icon: "image" },
  { entity: "events", label: "Events", icon: "calendar" },
  { entity: "alumni_offers", label: "Alumni offers", icon: "handshake" },
];

/** "Needs your attention" — pending submissions, one click from review. */
function AttentionStrip({ pending, onReview }: {
  pending: PendingCounts | null;
  onReview: (target: { entity: string; label: string } | null) => void;
}) {
  const total = pending?.total ?? 0;

  if (total === 0) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 11, background: "#F1F9F4", border: "1px solid #CBE7D4", borderRadius: radius.lg, padding: "14px 20px" }}>
        <span style={{ width: 34, height: 34, borderRadius: 9, background: "#0F8F6B18", color: "#0F8F6B", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon name="check" size={18} />
        </span>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: "#1E7E55" }}>
          You&apos;re all caught up — nothing is waiting for review.
        </div>
      </div>
    );
  }

  const waiting = PENDING_TYPES.filter((t) => (pending?.[t.entity] ?? 0) > 0);
  return (
    <section style={{ background: "#FFF7EC", border: "1.5px solid #F2D49B", borderRadius: radius.lg, padding: "18px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span style={{ width: 38, height: 38, borderRadius: 10, background: "#E0922E1c", color: "#E0922E", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon name="clock" size={20} />
        </span>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 15.5, fontWeight: 800, color: colors.ink }}>Needs your attention</div>
          <div style={{ fontSize: 13, color: "#8A6D3B", fontWeight: 600, marginTop: 1 }}>
            {total} {total === 1 ? "submission is" : "submissions are"} waiting for review.
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
        {waiting.map((t) => (
          <button
            key={t.entity}
            type="button"
            onClick={() => onReview({ entity: t.entity, label: t.label })}
            style={{ display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer", background: "#fff", border: "1.5px solid #F2D49B", borderRadius: radius.pill, padding: "8px 15px", fontSize: 13.5, fontWeight: 700, color: colors.ink }}
          >
            <Icon name={t.icon} size={15} />
            {t.label}
            <span style={{ fontSize: 11.5, fontWeight: 800, color: "#fff", background: "#E0922E", borderRadius: radius.pill, padding: "2px 8px" }}>
              {pending?.[t.entity] ?? 0}
            </span>
            <span style={{ color: "#E0922E" }}>Review ›</span>
          </button>
        ))}
      </div>
    </section>
  );
}

/** Verb-labeled shortcuts to every admin power (tabs + create pages). */
function QuickActions({ onGoTab }: { onGoTab: (t: Tab) => void }) {
  const btn: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer",
    background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.pill,
    padding: "10px 17px", fontSize: 13.5, fontWeight: 700, color: colors.ink, textDecoration: "none",
  };
  const links: { label: string; href: string; icon: IconName }[] = [
    { label: "Post opportunity", href: "/opportunities/new", icon: "briefcase" },
    { label: "Create event", href: "/events/new", icon: "calendar" },
    { label: "Create community", href: "/community/new", icon: "users" },
    { label: "Add resource", href: "/resources/new", icon: "book" },
  ];
  return (
    <section style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "18px 20px" }}>
      <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: colors.inkFaint, marginBottom: 12 }}>Quick actions</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={() => onGoTab("comms")} className="navitem" style={btn}>
          <Icon name="mail" size={15} /> Send announcement
        </button>
        <button type="button" onClick={() => onGoTab("members")} className="navitem" style={btn}>
          <Icon name="users" size={15} /> Manage members
        </button>
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="navitem" style={btn}>
            <Icon name={l.icon} size={15} /> {l.label}
          </Link>
        ))}
      </div>
    </section>
  );
}

/* A stacked panel. With onToggle it's collapsible (plus toggles open/closed);
   without one it's pinned open (used for Overview, which stays on top). */
function Section({ title, icon, open, onToggle, children }: {
  title: string; icon: IconName; open?: boolean; onToggle?: () => void; children: React.ReactNode;
}) {
  const collapsible = !!onToggle;
  const expanded = collapsible ? !!open : true;
  return (
    <section style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, overflow: "hidden" }}>
      <div
        onClick={onToggle}
        role={collapsible ? "button" : undefined}
        aria-expanded={collapsible ? expanded : undefined}
        style={{
          display: "flex", alignItems: "center", gap: 12, padding: "16px 20px",
          cursor: collapsible ? "pointer" : "default",
          borderBottom: expanded ? `1px solid ${colors.border}` : "none",
        }}
      >
        <span style={{ width: 34, height: 34, borderRadius: 9, background: colors.tintBlue, color: colors.brandDeep, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon name={icon} size={18} />
        </span>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: colors.ink, margin: 0, flex: 1 }}>{title}</h2>
        {collapsible && (
          <span aria-hidden style={{
            width: 30, height: 30, borderRadius: "50%", border: `1.5px solid ${colors.borderStrong}`,
            display: "flex", alignItems: "center", justifyContent: "center", color: colors.inkMuted, flexShrink: 0,
            transform: expanded ? "rotate(45deg)" : "none", transition: "transform 140ms ease",
          }}>
            <Icon name="plus" size={16} />
          </span>
        )}
      </div>
      {expanded && <div style={{ padding: "20px" }}>{children}</div>}
    </section>
  );
}

function OverviewStats({ o }: { o: AdminOverview | null }) {
  if (!o) return <ErrBox />;
  const tiles: { label: string; value: number; icon: IconName; accent: string }[] = [
    { label: "Scholarship recipients", value: o.scholars, icon: "cap", accent: "#11A6D6" },
    { label: "Registered alumni", value: o.alumni, icon: "users", accent: "#0F8F6B" },
    { label: "Administrators", value: o.admins, icon: "user", accent: "#7C5CD6" },
    { label: "Total members", value: o.total, icon: "globe", accent: "#E0922E" },
    { label: "Active accounts", value: o.active, icon: "check", accent: "#0F8F6B" },
    { label: "Completed onboarding", value: o.onboarded, icon: "award", accent: "#11A6D6" },
    { label: "New — last 7 days", value: o.new_7d, icon: "sparkle", accent: "#C9508A" },
    { label: "New — last 30 days", value: o.new_30d, icon: "calendar", accent: "#3B7DD8" },
  ];
  // Pending reviews moved to the AttentionStrip up top — this grid is pure stats.
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
      {tiles.map((t) => (
        <div key={t.label} style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "20px 22px" }}>
          <span style={{ width: 40, height: 40, borderRadius: 11, background: `${t.accent}15`, color: t.accent, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name={t.icon} size={21} /></span>
          <div style={{ fontSize: 30, fontWeight: 800, color: colors.ink, marginTop: 13 }}>{t.value}</div>
          <div style={{ fontSize: 13, color: colors.inkFaint, fontWeight: 600, marginTop: 2 }}>{t.label}</div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Demographics ---------------- */
const PALETTE = ["#11A6D6", "#0F8F6B", "#E0922E", "#7C5CD6", "#C9508A", "#3B7DD8", "#D9534F", "#2BB1A8", "#9AA5AD", "#E4B73B", "#6C8AE4", "#4FAE7B"];

function DemographicsTab({ d }: { d: AdminDemographics | null }) {
  const [view, setView] = useState<"bars" | "donut">("bars");
  if (!d) return <ErrBox />;
  const cards: { title: string; rows: Breakdown[] }[] = [
    { title: "By country of study", rows: d.by_country },
    { title: "By nationality", rows: d.by_nationality },
    { title: "By gender", rows: d.by_gender },
    { title: "By role", rows: d.by_role },
    { title: "By degree level", rows: d.by_degree },
  ];
  const views: { v: "bars" | "donut"; label: string; icon: IconName }[] = [
    { v: "bars", label: "Bars", icon: "sparkle" },
    { v: "donut", label: "Donut", icon: "globe" },
  ];
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <div style={{ display: "inline-flex", background: "#fff", border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.pill, padding: 3 }}>
          {views.map((x) => (
            <button key={x.v} type="button" onClick={() => setView(x.v)} style={{ display: "inline-flex", alignItems: "center", gap: 6, border: 0, cursor: "pointer", borderRadius: radius.pill, padding: "7px 15px", fontSize: 13, fontWeight: 700, background: view === x.v ? colors.brand : "transparent", color: view === x.v ? "#fff" : colors.inkMuted }}>
              <Icon name={x.icon} size={14} /> {x.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(320px, 100%), 1fr))", gap: 16 }}>
        {cards.map((c) => (
          <ChartCard key={c.title} title={c.title} rows={c.rows} view={view} />
        ))}
      </div>
    </div>
  );
}

function ChartCard({ title, rows, view }: { title: string; rows: Breakdown[]; view: "bars" | "donut" }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "20px 22px" }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: colors.ink, margin: "0 0 16px" }}>{title}</h3>
      {rows.length === 0 ? (
        <div style={{ fontSize: 13, color: colors.inkFaint }}>No data yet.</div>
      ) : view === "bars" ? (
        <Bars rows={rows} />
      ) : (
        <Donut rows={rows} />
      )}
    </div>
  );
}

function Bars({ rows }: { rows: Breakdown[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
      {rows.map((r, i) => (
        <div key={r.label}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
            <span style={{ color: colors.inkMuted, fontWeight: 600, textTransform: "capitalize" }}>{r.label}</span>
            <span style={{ color: colors.inkFaint, fontWeight: 700 }}>{r.count}</span>
          </div>
          <div style={{ height: 8, background: colors.bg, borderRadius: radius.pill, overflow: "hidden" }}>
            <div style={{ width: `${(r.count / max) * 100}%`, height: "100%", background: PALETTE[i % PALETTE.length], borderRadius: radius.pill }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Donut({ rows }: { rows: Breakdown[] }) {
  const total = rows.reduce((a, r) => a + r.count, 0) || 1;
  const R = 54, C = 64, sw = 22, circ = 2 * Math.PI * R;
  let offset = 0;
  const segs = rows.map((r, i) => {
    const frac = r.count / total;
    const seg = { color: PALETTE[i % PALETTE.length], dash: frac * circ, offset: offset * circ, pct: Math.round(frac * 100) };
    offset += frac;
    return seg;
  });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
      <svg width={C * 2} height={C * 2} viewBox={`0 0 ${C * 2} ${C * 2}`} style={{ flexShrink: 0 }}>
        <g transform={`rotate(-90 ${C} ${C})`}>
          <circle cx={C} cy={C} r={R} fill="none" stroke={colors.bg} strokeWidth={sw} />
          {segs.map((s, i) => (
            <circle key={i} cx={C} cy={C} r={R} fill="none" stroke={s.color} strokeWidth={sw}
              strokeDasharray={`${s.dash} ${circ - s.dash}`} strokeDashoffset={-s.offset} />
          ))}
        </g>
        <text x={C} y={C - 2} textAnchor="middle" fontSize="20" fontWeight="800" fill={colors.ink}>{total}</text>
        <text x={C} y={C + 15} textAnchor="middle" fontSize="10" fontWeight="600" fill={colors.inkFaint}>total</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 7, minWidth: 0, flex: 1 }}>
        {rows.map((r, i) => (
          <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: PALETTE[i % PALETTE.length], flexShrink: 0 }} />
            <span style={{ color: colors.inkMuted, fontWeight: 600, textTransform: "capitalize", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{r.label}</span>
            <span style={{ color: colors.inkFaint, fontWeight: 700 }}>{r.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Engagement (content + moderation) ---------------- */
type ContentCard = { entity: string; label: string; value: number; icon: IconName; pending: number };

function EngagementTab({ e, pending, initialReview }: {
  e: AdminEngagement | null; pending: PendingCounts | null;
  initialReview?: { entity: string; label: string } | null;
}) {
  // A chip in the AttentionStrip lands here with its review panel pre-opened.
  const [review, setReview] = useState<{ entity: string; label: string } | null>(initialReview ?? null);
  if (!e) return <ErrBox />;
  const content: ContentCard[] = [
    { entity: "stories", label: "Stories", value: e.stories, icon: "fileText", pending: pending?.stories ?? 0 },
    { entity: "research_posts", label: "Research posts", value: e.research, icon: "flask", pending: pending?.research_posts ?? 0 },
    { entity: "community_projects", label: "Community projects", value: e.projects, icon: "heart", pending: pending?.community_projects ?? 0 },
    { entity: "showcase_items", label: "Showcase items", value: e.showcase, icon: "image", pending: pending?.showcase_items ?? 0 },
    { entity: "events", label: "Events", value: e.events, icon: "calendar", pending: pending?.events ?? 0 },
    { entity: "alumni_offers", label: "Alumni offers", value: e.offers, icon: "handshake", pending: pending?.alumni_offers ?? 0 },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
      <Trend points={e.signups_trend} />
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 9, margin: "0 0 6px" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: colors.ink, margin: 0 }}>Content &amp; moderation</h3>
        </div>
        <p style={{ fontSize: 13, color: colors.inkFaint, margin: "0 0 14px" }}>Click a card to review what members have submitted and approve or reject it.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 14 }}>
          {content.map((t) => (
            <button key={t.entity} type="button" onClick={() => setReview({ entity: t.entity, label: t.label })}
              style={{ textAlign: "left", cursor: "pointer", position: "relative", background: "#fff", border: `1.5px solid ${t.pending > 0 ? "#F2D49B" : colors.border}`, borderRadius: radius.lg, padding: "16px 18px", display: "flex", alignItems: "center", gap: 13 }}>
              <span style={{ width: 40, height: 40, borderRadius: 10, background: colors.tintBlue, color: colors.brandDeep, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name={t.icon} size={20} /></span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: colors.ink, lineHeight: 1 }}>{t.value}</div>
                <div style={{ fontSize: 12.5, color: colors.inkFaint, fontWeight: 600, marginTop: 3 }}>{t.label}</div>
              </div>
              {t.pending > 0 ? (
                <span style={{ flexShrink: 0, fontSize: 11.5, fontWeight: 800, color: "#fff", background: "#E0922E", borderRadius: radius.pill, padding: "3px 9px" }}>{t.pending}</span>
              ) : (
                <Icon name="check" size={16} />
              )}
            </button>
          ))}
        </div>
      </div>

      {review && <ContentModeration entity={review.entity} label={review.label} onClose={() => setReview(null)} />}
    </div>
  );
}

function Trend({ points }: { points: { date: string; count: number }[] }) {
  const max = Math.max(1, ...points.map((p) => p.count));
  const total = points.reduce((a, p) => a + p.count, 0);
  const W = 720, H = 120, pad = 6;
  const step = points.length > 1 ? (W - pad * 2) / (points.length - 1) : 0;
  const pts = points.map((p, i) => {
    const x = pad + i * step;
    const y = H - pad - (p.count / max) * (H - pad * 2);
    return `${x},${y}`;
  });
  const line = pts.join(" ");
  const area = points.length ? `${pad},${H - pad} ${line} ${pad + (points.length - 1) * step},${H - pad}` : "";

  return (
    <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "20px 22px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: colors.ink, margin: 0 }}>New sign-ups · last 30 days</h3>
        <span style={{ fontSize: 13, color: colors.inkFaint, fontWeight: 600 }}>{total} total</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: 120, display: "block" }}>
        {area && <polygon points={area} fill={colors.brand} opacity={0.10} />}
        {line && <polyline points={line} fill="none" stroke={colors.brand} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />}
      </svg>
    </div>
  );
}

/* ---------------- Members ---------------- */
function MembersTab({ members, currentUserId }: { members: AdminMember[]; currentUserId: string }) {
  const [q, setQ] = useState("");
  const [role, setRole] = useState<string>("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return members.filter((m) =>
      (!role || m.role === role) &&
      (!term || m.full_name?.toLowerCase().includes(term) || m.email?.toLowerCase().includes(term)),
    );
  }, [members, q, role]);

  const roleTabs = [
    { v: "", label: "All" },
    { v: "scholar", label: "Scholars" },
    { v: "alumni", label: "Alumni" },
    { v: "admin", label: "Admins" },
  ];

  return (
    <div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
        <div style={{ position: "relative", flex: 1, minWidth: 240, maxWidth: 420 }}>
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: colors.inkFaint, pointerEvents: "none" }}><Icon name="compass" size={16} /></span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email…" style={{ width: "100%", padding: "10px 14px 10px 40px", fontSize: 14, color: colors.ink, background: "#fff", border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.pill, outline: "none" }} />
        </div>
        <div style={{ display: "inline-flex", background: "#fff", border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.pill, padding: 3 }}>
          {roleTabs.map((r) => (
            <button key={r.v} type="button" onClick={() => setRole(r.v)} style={{ border: 0, cursor: "pointer", borderRadius: radius.pill, padding: "7px 15px", fontSize: 13, fontWeight: 700, background: role === r.v ? colors.brand : "transparent", color: role === r.v ? "#fff" : colors.inkMuted }}>{r.label}</button>
          ))}
        </div>
      </div>

      <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, overflow: "hidden" }}>
        {/* Header row */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(180px,2fr) 1.1fr 1fr", gap: 12, padding: "12px 16px", fontSize: 11.5, fontWeight: 700, color: colors.inkFaint, textTransform: "uppercase", letterSpacing: 0.4 }}>
          <span>Member</span><span>Profile</span><span>Joined</span>
        </div>
        {filtered.length === 0 ? (
          <div style={{ padding: "32px", textAlign: "center", color: colors.inkFaint, fontSize: 14, borderTop: `1px solid ${colors.border}` }}>No members match.</div>
        ) : (
          filtered.map((m) => <AdminMemberRow key={m.id} m={m} isSelf={m.id === currentUserId} />)
        )}
      </div>
      <p style={{ fontSize: 12.5, color: colors.inkFaint, margin: "12px 2px 0" }}>Showing {filtered.length} of {members.length} members (newest 200).</p>
    </div>
  );
}

function ErrBox() {
  return (
    <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "36px", textAlign: "center", color: colors.inkFaint, fontSize: 14 }}>
      Couldn&apos;t load this data. Make sure <code>phase12_admin.sql</code> has been run.
    </div>
  );
}
