import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getMyFullProfile,
  getDashboardStats,
  profileCompletion,
} from "@/lib/profiles";
import {
  getAdminOverview,
  getAdminDemographics,
  getAdminEngagement,
  getAdminMembers,
  getAnnouncements,
  getMyAnnouncements,
  getPendingCounts,
  getModerators,
} from "@/lib/admin";
import AdminDashboard from "@/components/AdminDashboard";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import DashboardBoard, { type DashboardData } from "@/components/DashboardBoard";
import { getDashboardLayout } from "@/app/(app)/dashboard-actions";
import { listEvents } from "@/lib/events";
import { listStories } from "@/lib/stories";
import { listShowcase } from "@/lib/showcase";
import { listOpportunities } from "@/lib/opportunities";
import { getMyMentorships } from "@/lib/mentorship";
import { listAlumni, listOffers, getOfferKindCounts, type AlumniCard, type OfferCard } from "@/lib/alumni";
import { ALUMNI_OFFER_KINDS } from "@/lib/alumniOffers";
import AlumniNetwork from "@/components/AlumniNetwork";
import { colors, radius, shadow, gradients } from "@/lib/theme";

/** One inline stat shown in the hero strip. */
function HeroStat({ value, label }: { value: number | string; label: string }) {
  return (
    <div style={{ background: "rgba(255,255,255,.16)", borderRadius: radius.md, padding: "12px 18px", minWidth: 104 }}>
      <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12.5, fontWeight: 600, opacity: 0.92, marginTop: 5 }}>{label}</div>
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; kind?: string; mentors?: string; tab?: string; view?: string }>;
}) {
  const data = await getMyFullProfile();
  if (!data) redirect("/login");

  const firstName = (data.profile.full_name || "Scholar").split(/\s+/)[0];

  // Admins get the management module as their Home page.
  if (data.profile.role === "admin") {
    const [overview, demographics, engagement, members, announcements, pending, moderators] = await Promise.all([
      getAdminOverview(),
      getAdminDemographics(),
      getAdminEngagement(),
      getAdminMembers(),
      getAnnouncements(),
      getPendingCounts(),
      getModerators(),
    ]);
    return (
      <AdminDashboard
        firstName={firstName}
        overview={overview}
        demographics={demographics}
        engagement={engagement}
        members={members}
        announcements={announcements}
        pending={pending}
        moderators={moderators}
        currentUserId={data.profile.id}
      />
    );
  }

  const userId = data.profile.id;
  const completion = profileCompletion(data);
  const isAlumni = data.profile.role === "alumni";

  // Alumni Network lives on the alumni Home dashboard (its own sidebar tab was removed),
  // split into a "Dashboard" tab and a "My network" tab (?tab=network). Inside My network,
  // two sub-views keep each screen focused: "people" (directory) and "offers" (give back).
  const { q, kind, mentors, tab, view } = await searchParams;
  const showNetwork = isAlumni && tab === "network";
  const networkView: "people" | "offers" = view === "offers" ? "offers" : "people";
  const mentorsOnly = mentors === "1";
  const kindFilter = ALUMNI_OFFER_KINDS.includes((kind ?? "") as (typeof ALUMNI_OFFER_KINDS)[number]) ? kind : undefined;

  // Hero stats + everything the customizable widgets might show, in parallel.
  const [stats, myAnnouncements, layout, eventsRes, stories, showcase, opportunities, mentorships] =
    await Promise.all([
      getDashboardStats(userId),
      getMyAnnouncements(),
      getDashboardLayout(),
      listEvents({ userId }),
      listStories({ userId }),
      listShowcase(),
      listOpportunities({ userId }),
      getMyMentorships(),
    ]);

  const activeMentorships = mentorships.filter((m) => m.status === "active");
  const mentorCount = activeMentorships.filter((m) => m.role === "mentee").length;

  const boardData: DashboardData = {
    events: eventsRes.upcoming.slice(0, 8).map((e) => ({
      id: e.id, title: e.title, start_at: e.start_at, event_type: e.event_type, mode: e.mode, location: e.location,
    })),
    stories: stories.slice(0, 4).map((s) => ({
      id: s.id, title: s.title, category: s.category, read_minutes: s.read_minutes, author_name: s.author_name, like_count: s.like_count,
    })),
    showcase: showcase.slice(0, 6).map((s) => ({
      id: s.id, title: s.title, media_type: s.media_type, thumbnail_url: s.thumbnail_url, media_url: s.media_url,
    })),
    opportunities: opportunities.slice(0, 4).map((o) => ({
      id: o.id, title: o.title, company_name: o.company_name, opportunity_type: o.opportunity_type, is_remote: o.is_remote, location: o.location, deadline: o.deadline,
    })),
    mentorships: activeMentorships.slice(0, 4).map((m) => ({
      id: m.id, counterpart_name: m.counterpart_name, counterpart_avatar: m.counterpart_avatar, counterpart_sub: m.counterpart_sub, role: m.role,
    })),
  };

  // Alumni-only network data — fetch only the sub-view that's open, nothing more.
  let alumni: AlumniCard[] = [];
  let publicOffers: OfferCard[] = [];
  let myOffers: OfferCard[] = [];
  let kindCounts: Record<string, number> = {};
  if (showNetwork && networkView === "people") {
    alumni = await listAlumni({ search: q, mentorsOnly });
  } else if (showNetwork && networkView === "offers") {
    const [allOffers, mine, counts] = await Promise.all([
      listOffers({ userId, kind: kindFilter, openOnly: true }),
      listOffers({ userId, alumniId: userId }),
      getOfferKindCounts(),
    ]);
    publicOffers = allOffers.filter((o) => o.alumni_id !== userId);
    myOffers = mine;
    kindCounts = counts;
  }
  const totalOpen = Object.values(kindCounts).reduce((a, b) => a + b, 0);

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px", width: "100%" }}>
      {/* Hero greeting */}
      <div style={{ background: gradients.hero, borderRadius: radius.lg, padding: "30px 34px", color: "#fff", position: "relative", overflow: "hidden", marginBottom: 24 }}>
        <svg viewBox="0 0 1200 200" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.16 }}>
          <path d="M0 120 C150 80 320 160 520 120 C740 76 920 162 1200 120" fill="none" stroke="#fff" strokeWidth="2.5" />
          <path d="M0 160 C150 120 320 200 520 160 C740 116 920 202 1200 160" fill="none" stroke="#fff" strokeWidth="2.5" />
        </svg>
        <div style={{ position: "relative", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 30, fontWeight: 700 }}>Welcome back, {firstName}</div>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <HeroStat value={stats.followers} label="Followers" />
            <HeroStat value={mentorCount} label="My mentors" />
            <HeroStat value={stats.following} label="Following" />
          </div>
        </div>
      </div>

      {/* Alumni split their Home into Dashboard / My network tabs. */}
      {isAlumni && (
        <div style={{ display: "flex", gap: 26, borderBottom: `1px solid ${colors.border}`, marginBottom: 26 }}>
          <Link href="/" style={tabStyle(!showNetwork)}>Dashboard</Link>
          <Link href="/?tab=network" style={tabStyle(showNetwork)}>My network</Link>
        </div>
      )}

      {showNetwork ? (
        <AlumniNetwork
          basePath="/"
          baseParams={{ tab: "network", view: networkView }}
          view={networkView}
          isAlumni={isAlumni}
          alumni={alumni}
          publicOffers={publicOffers}
          myOffers={myOffers}
          kindCounts={kindCounts}
          totalOpen={totalOpen}
          q={q}
          kindFilter={kindFilter}
          mentorsOnly={mentorsOnly}
        />
      ) : (
        <>
          {/* Announcements from TBHF */}
          <AnnouncementBanner items={myAnnouncements} />

          {/* Profile completion nudge */}
          {completion < 100 && (
            <div style={{ background: "#fff", border: `1px solid ${colors.borderBlue}`, borderRadius: radius.lg, padding: "18px 22px", marginBottom: 24, display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 240 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: colors.ink }}>Complete your profile — {completion}%</div>
                <div style={{ height: 9, background: colors.bg, borderRadius: radius.pill, marginTop: 10, overflow: "hidden" }}>
                  <div style={{ width: `${completion}%`, height: "100%", background: colors.brand, borderRadius: radius.pill }} />
                </div>
              </div>
              <Link href="/profile/edit" style={{ background: colors.brand, color: "#fff", borderRadius: radius.pill, padding: "11px 22px", fontSize: 14.5, fontWeight: 700, boxShadow: shadow.brand }}>
                Complete now
              </Link>
            </div>
          )}

          {/* Customizable widget board */}
          <DashboardBoard data={boardData} firstName={firstName} initialLayout={layout} />
        </>
      )}
    </div>
  );
}

function tabStyle(active: boolean): React.CSSProperties {
  return {
    fontSize: 15.5,
    fontWeight: 700,
    paddingBottom: 12,
    marginBottom: -1,
    color: active ? colors.ink : colors.inkFaint,
    borderBottom: `2.5px solid ${active ? colors.brand : "transparent"}`,
  };
}
