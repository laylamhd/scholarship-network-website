import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentUser, getMyRole, getEnumValues } from "@/lib/profiles";
import { getMyCapabilities } from "@/lib/admin";
import { listEvents, getEventTypeCounts } from "@/lib/events";
import { listProjects, getMyImpact, type ProjectCard } from "@/lib/volunteer";
import { causeIcon, causeColor, statusLabel } from "@/lib/volunteerCauses";
import EventsCalendar from "@/components/EventsCalendar";
import EventTypeFilter from "@/components/EventTypeFilter";
import LogHoursButton from "@/components/LogHoursButton";
import VolunteerSearch from "@/components/VolunteerSearch";
import { Icon, type IconName } from "@/components/Icon";
import { colors, radius } from "@/lib/theme";

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; type?: string; status?: string; q?: string; cause?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { tab, type, status, q, cause } = await searchParams;
  const isVol = tab === "volunteering";
  const role = await getMyRole();
  // Admins and moderators with the events/resources capability both manage events.
  const caps = role === "admin" ? [] : await getMyCapabilities();
  const isAdmin = role === "admin" || caps.includes("manage_events_resources");

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 28px 48px", width: "100%" }}>
      {/* Masthead */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", paddingBottom: 18, borderBottom: `2px solid ${colors.ink}` }}>
        <div>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: colors.ink, margin: 0, letterSpacing: "-0.02em" }}>Events &amp; Volunteering</h1>
          <p style={{ fontSize: 15, color: colors.inkFaint, margin: "6px 0 0", maxWidth: 560, lineHeight: 1.5 }}>
            {isVol
              ? "Start community projects, lend a hand, and track the difference you make."
              : "Workshops, webinars and volunteer projects — all on one calendar."}
          </p>
        </div>
        {isVol ? (
          <Link href="/volunteer/new" style={createBtn()}>
            <Icon name="handshake" size={17} /> Start a project
          </Link>
        ) : (
          <Link href="/events/new" style={createBtn()}>
            <Icon name="calendar" size={17} /> {isAdmin ? "Create event" : "Submit an event"}
          </Link>
        )}
      </div>

      {/* Primary tabs */}
      <div style={{ display: "flex", gap: 26, marginTop: 14 }}>
        <Link href="/events" style={tabStyle(!isVol)}>Events</Link>
        <Link href="/events?tab=volunteering" style={tabStyle(isVol)}>Volunteering</Link>
      </div>

      <div style={{ marginTop: 26 }}>
        {isVol ? (
          <VolunteeringTab userId={user.id} status={status} q={q} cause={cause} />
        ) : (
          <EventsTab userId={user.id} type={type} isAdmin={isAdmin} />
        )}
      </div>
    </div>
  );
}

/* ======================= Events tab ======================= */
async function EventsTab({ userId, type, isAdmin }: { userId: string; type?: string; isAdmin: boolean }) {
  const [{ upcoming, past }, calProjects, counts] = await Promise.all([
    listEvents({ userId, type }),
    listProjects({ userId }),
    getEventTypeCounts(),
  ]);
  // Everyone can quick-add from the calendar, so everyone needs the mode options.
  const modes = await getEnumValues("event_mode");
  const events = [...upcoming, ...past];
  const countsObj = Object.fromEntries(counts);

  return (
    <>
      {/* Type filter */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 22 }}>
        <EventTypeFilter selected={type} counts={countsObj} />
      </div>

      <EventsCalendar events={events} projects={calProjects} modes={modes} />
    </>
  );
}

/* ======================= Volunteering tab ======================= */
async function VolunteeringTab({ userId, status, q, cause }: { userId: string; status?: string; q?: string; cause?: string }) {
  const [projects, impact, myProjects] = await Promise.all([
    listProjects({ userId, status, search: q, cause }),
    getMyImpact(userId),
    listProjects({ userId, mineOnly: true }),
  ]);

  const projectOpts = [
    ...myProjects.map((p) => ({ id: p.id, title: p.title })),
    ...projects.filter((p) => p.i_volunteer).map((p) => ({ id: p.id, title: p.title })),
  ].filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i);

  const totalHoursStr = impact.totalHours % 1 === 0 ? String(impact.totalHours) : impact.totalHours.toFixed(1);

  const cur: Record<string, string | undefined> = { status, q, cause };
  const href = (ov: Record<string, string | null>) => {
    const m = { ...cur, ...ov };
    const sp = new URLSearchParams({ tab: "volunteering" });
    (["status", "q", "cause"] as const).forEach((k) => { if (m[k]) sp.set(k, m[k] as string); });
    return `/events?${sp.toString()}`;
  };
  const filtered = Boolean(status || q?.trim() || cause);

  return (
    <>
      {/* Your impact */}
      <Section title="Your impact" action={<LogHoursButton projects={projectOpts} variant="ghost" />}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
          <ImpactStat icon="clock" value={totalHoursStr} label="Hours volunteered" />
          <ImpactStat icon="handshake" value={String(impact.projectsJoined)} label="Projects joined" />
          <ImpactStat icon="users" value={String(myProjects.length)} label="Projects organized" />
        </div>
      </Section>

      {/* Find a project */}
      <Section title="Find a project">
        <VolunteerSearch initialQuery={q ?? ""} />
      </Section>

      {/* Community projects */}
      <div style={{ marginTop: 34 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: colors.ink, margin: "0 0 14px" }}>Community projects</h2>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
          <div style={{ display: "inline-flex", background: "#fff", border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.pill, padding: 3, flexWrap: "wrap" }}>
            <Seg href={href({ status: null })} active={!status}>All</Seg>
            <Seg href={href({ status: "recruiting" })} active={status === "recruiting"}>Recruiting</Seg>
            <Seg href={href({ status: "ongoing" })} active={status === "ongoing"}>Ongoing</Seg>
            <Seg href={href({ status: "completed" })} active={status === "completed"}>Completed</Seg>
          </div>
        </div>

        {filtered && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, fontSize: 13, color: colors.inkMuted }}>
            <span>{projects.length} {projects.length === 1 ? "result" : "results"}{cause ? ` · ${cause}` : ""}{status ? ` · ${statusLabel(status)}` : ""}{q ? ` · “${q}”` : ""}</span>
            <Link href="/events?tab=volunteering" style={{ color: colors.brand, fontWeight: 700 }}>Clear</Link>
          </div>
        )}

        {projects.length === 0 ? (
          <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "46px", textAlign: "center", color: colors.inkFaint, fontSize: 14.5 }}>
            <div style={{ marginBottom: 14, opacity: 0.5, display: "flex", justifyContent: "center" }}><Icon name="handshake" size={38} /></div>
            {q ? `Nothing matches “${q}”.` : "No projects here yet — start the first one."}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {projects.map((p) => <ProjectCardView key={p.id} p={p} />)}
          </div>
        )}
      </div>
    </>
  );
}

/* ======================= shared bits ======================= */
function createBtn(): React.CSSProperties {
  return { background: colors.brand, color: "#fff", borderRadius: radius.pill, padding: "11px 22px", fontSize: 14.5, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 7, boxShadow: "0 6px 16px rgba(17,166,214,.26)" };
}

function tabStyle(active: boolean): React.CSSProperties {
  return {
    fontSize: 15.5, fontWeight: 700, paddingBottom: 8,
    color: active ? colors.ink : colors.inkFaint,
    borderBottom: `2.5px solid ${active ? colors.brand : "transparent"}`,
  };
}

/* ---------------- volunteer portal helpers ---------------- */
function initials(name: string): string {
  const p = name.trim().split(/\s+/);
  return (p[0]?.[0] ?? "") + (p[1]?.[0] ?? "");
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string }> = {
    recruiting: { bg: "#E6F6F0", fg: "#0F8F6B" },
    ongoing: { bg: colors.tintBlue, fg: colors.brandDeep },
    completed: { bg: colors.bg, fg: colors.inkMuted },
  };
  const c = map[status] ?? map.ongoing;
  return <span style={{ fontSize: 11, fontWeight: 700, color: c.fg, background: c.bg, padding: "3px 10px", borderRadius: radius.pill }}>{statusLabel(status)}</span>;
}

function ProjectCardView({ p }: { p: ProjectCard }) {
  const accent = causeColor(p.cause);
  return (
    <Link href={`/volunteer/${p.id}`} className="card" style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ position: "relative", height: 150, background: `${accent}14` }}>
        {p.image_url ? (
          <Image src={p.image_url} alt={p.title} fill style={{ objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: accent, opacity: 0.6 }}>
            <Icon name={causeIcon(p.cause)} size={42} />
          </div>
        )}
        <span style={{ position: "absolute", top: 10, left: 10 }}><StatusPill status={p.status} /></span>
      </div>
      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", flex: 1 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: accent, background: `${accent}18`, padding: "3px 10px", borderRadius: radius.pill, alignSelf: "flex-start" }}>
          <Icon name={causeIcon(p.cause)} size={12} /> {p.cause}
        </span>
        <div style={{ fontSize: 16.5, fontWeight: 700, color: colors.ink, marginTop: 10, lineHeight: 1.3 }}>{p.title}</div>
        <div style={{ fontSize: 13.5, color: colors.inkMuted, marginTop: 6, lineHeight: 1.5, flex: 1, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.description}</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, fontSize: 12.5, color: colors.inkFaint }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0 }}>
            {p.organizer_avatar ? (
              <Image src={p.organizer_avatar} alt={p.organizer_name} width={22} height={22} style={{ width: 22, height: 22, borderRadius: 999, objectFit: "cover" }} />
            ) : (
              <span style={{ width: 22, height: 22, borderRadius: 999, background: colors.tintBlueDeep, color: colors.brandDeep, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9.5, fontWeight: 700, textTransform: "uppercase" }}>{initials(p.organizer_name)}</span>
            )}
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.organizer_name}</span>
          </span>
          {p.volunteer_count > 0 && <span style={{ display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0 }}><Icon name="handshake" size={14} /> {p.volunteer_count}</span>}
        </div>
      </div>
    </Link>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 26 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: colors.ink, margin: 0, letterSpacing: ".01em" }}>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function ImpactStat({ icon, value, label }: { icon: IconName; value: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "16px 18px" }}>
      <span style={{ width: 44, height: 44, borderRadius: 12, background: colors.tintBlue, color: colors.brandDeep, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon name={icon} size={22} />
      </span>
      <div>
        <div style={{ fontSize: 24, fontWeight: 800, color: colors.ink, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12.5, color: colors.inkFaint, fontWeight: 600, marginTop: 4 }}>{label}</div>
      </div>
    </div>
  );
}

function Seg({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} style={{ borderRadius: radius.pill, padding: "7px 15px", fontSize: 13, fontWeight: 700, color: active ? "#fff" : colors.inkMuted, background: active ? colors.brand : "transparent" }}>
      {children}
    </Link>
  );
}
