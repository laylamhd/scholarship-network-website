import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentUser, getMyRole } from "@/lib/profiles";
import {
  listMentors,
  getMyMentorships,
  getMyMentorAvailability,
  type MentorCard,
  type MentorshipItem,
} from "@/lib/mentorship";
import MentorRequestButton from "@/components/MentorRequestButton";
import MentorAvailabilityForm from "@/components/MentorAvailabilityForm";
import MentorSearch from "@/components/MentorSearch";
import { RespondActions, EndButton } from "@/components/MentorshipActions";
import { startConversation } from "@/app/(app)/messages/actions";
import { Icon } from "@/components/Icon";
import { colors, radius, shadow, gradients } from "@/lib/theme";

function pillLink(): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", gap: 8,
    background: colors.tintBlue, color: colors.brandDeep,
    border: `1.5px solid ${colors.borderBlue}`, borderRadius: radius.pill,
    padding: "10px 18px", fontSize: 14, fontWeight: 700,
  };
}

function initials(name: string): string {
  const p = name.trim().split(/\s+/);
  return (p[0]?.[0] ?? "") + (p[1]?.[0] ?? "");
}

function Avatar({ url, name, size = 52 }: { url: string | null; name: string; size?: number }) {
  if (url) {
    return <Image src={url} alt={name} width={size} height={size} style={{ width: size, height: size, borderRadius: 999, objectFit: "cover" }} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: 999, background: colors.tintBlueDeep, color: colors.brandDeep, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.34, fontWeight: 700, textTransform: "uppercase", flexShrink: 0 }}>
      {initials(name)}
    </div>
  );
}

function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <h2 style={{ fontSize: 19, fontWeight: 700, color: colors.ink, margin: 0 }}>{children}</h2>
      {hint && <p style={{ fontSize: 13.5, color: colors.inkFaint, margin: "4px 0 0" }}>{hint}</p>}
    </div>
  );
}

export default async function MentorshipPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; view?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { q, view } = await searchParams;
  const role = await getMyRole();
  const isAlumni = role === "alumni";

  // Student-only filtered views ("Requested" / "My mentors" buttons).
  const studentView = !isAlumni && (view === "requested" || view === "accepted") ? view : null;

  // These three are independent — fetch them in one round trip instead of three.
  // The directory is only queried when a student is browsing (not a filtered view).
  const [mine, mentors, availability] = await Promise.all([
    getMyMentorships(),
    !isAlumni && !studentView ? listMentors(q) : Promise.resolve<MentorCard[]>([]),
    isAlumni ? getMyMentorAvailability(user.id) : Promise.resolve({ willing: false, topics: null }),
  ]);
  const incoming = mine.filter((m) => m.role === "mentor" && m.status === "pending");
  const active = mine.filter((m) => m.status === "active");
  const sentPending = mine.filter((m) => m.role === "mentee" && m.status === "pending");

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px", width: "100%" }}>
      {/* Hero */}
      <div style={{ background: gradients.hero, borderRadius: radius.lg, padding: "28px 32px", color: "#fff", marginBottom: 26, display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
        <span style={{ width: 54, height: 54, borderRadius: 16, background: "rgba(255,255,255,.18)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon name="handshake" size={30} />
        </span>
        <div>
          <h1 style={{ fontSize: 27, fontWeight: 700, margin: 0 }}>Mentorship</h1>
          <p style={{ fontSize: 15, opacity: 0.92, margin: "5px 0 0", maxWidth: 620, lineHeight: 1.5 }}>
            Connect current scholars with alumni who have walked the path before.
          </p>
        </div>
      </div>

      {isAlumni ? (
        /* ============ ALUMNI (mentor side) ============ */
        <>
          <MentorAvailabilityForm initialWilling={availability.willing} initialTopics={availability.topics} />

          {incoming.length > 0 && (
            <section style={{ marginBottom: 30 }}>
              <SectionTitle hint="Scholars who'd like you to mentor them.">
                Requests for you{" "}
                <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", background: colors.brand, borderRadius: radius.pill, padding: "2px 10px", verticalAlign: "middle" }}>{incoming.length}</span>
              </SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
                {incoming.map((m) => (
                  <RelationshipCard key={m.id} m={m}>
                    <RespondActions id={m.id} />
                  </RelationshipCard>
                ))}
              </div>
            </section>
          )}

          <section>
            <SectionTitle hint="Scholars you're currently mentoring.">Active mentorships</SectionTitle>
            {active.length === 0 ? (
              <EmptyBox>No active mentorships yet. Accepted requests will appear here.</EmptyBox>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
                {active.map((m) => <ActiveCard key={m.id} m={m} />)}
              </div>
            )}
          </section>
        </>
      ) : studentView ? (
        /* ============ STUDENT filtered view ============ */
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
            <h2 style={{ fontSize: 19, fontWeight: 700, color: colors.ink, margin: 0 }}>
              {studentView === "requested" ? "Requested mentors" : "My mentors"}
            </h2>
            <Link href="/mentorship" style={{ fontSize: 13.5, color: colors.brand, fontWeight: 600 }}>‹ Find a mentor</Link>
          </div>

          {studentView === "requested" ? (
            sentPending.length === 0 ? (
              <EmptyBox>You haven’t requested any mentors yet.</EmptyBox>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
                {sentPending.map((m) => (
                  <RelationshipCard key={m.id} m={m} pendingBadge>
                    <EndButton id={m.id} label="Cancel request" />
                  </RelationshipCard>
                ))}
              </div>
            )
          ) : active.length === 0 ? (
            <EmptyBox>No mentors have accepted yet. Accepted requests show up here.</EmptyBox>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
              {active.map((m) => <ActiveCard key={m.id} m={m} />)}
            </div>
          )}
        </>
      ) : (
        /* ============ STUDENT browse: Find a mentor ============ */
        <section>
          <SectionTitle>Find a mentor</SectionTitle>

          <MentorSearch initialQuery={q ?? ""} />

          {/* Quick filters (mirror the Career page) */}
          <div style={{ display: "flex", gap: 12, marginBottom: 22, flexWrap: "wrap" }}>
            <Link href="/mentorship?view=requested" style={pillLink()}>
              <Icon name="clock" size={15} /> Requested
              {sentPending.length > 0 && <Badge>{sentPending.length}</Badge>}
            </Link>
            <Link href="/mentorship?view=accepted" style={pillLink()}>
              <Icon name="check" size={15} /> My mentors
              {active.length > 0 && <Badge>{active.length}</Badge>}
            </Link>
          </div>

          {mentors.length === 0 ? (
            <EmptyBox>{q ? `No mentors match “${q}”.` : "No alumni mentors are available just yet — check back soon."}</EmptyBox>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
              {mentors.map((m) => <MentorCardView key={m.mentor_id} m={m} />)}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ minWidth: 20, height: 20, padding: "0 6px", fontSize: 11.5, fontWeight: 700, color: "#fff", background: colors.brand, borderRadius: radius.pill, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      {children}
    </span>
  );
}

function EmptyBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "40px", textAlign: "center", color: colors.inkFaint, fontSize: 14.5 }}>
      {children}
    </div>
  );
}

/* ---------- active mentorship card (Message + End) ---------- */
function ActiveCard({ m }: { m: MentorshipItem }) {
  return (
    <RelationshipCard m={m}>
      <div style={{ display: "flex", gap: 8, width: "100%" }}>
        <form action={startConversation.bind(null, m.counterpart_id)} style={{ flex: 1 }}>
          <button type="submit" style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, background: colors.brand, color: "#fff", border: 0, borderRadius: radius.pill, padding: "9px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: shadow.brand }}>
            <Icon name="chat" size={15} /> Message
          </button>
        </form>
        <EndButton id={m.id} />
      </div>
    </RelationshipCard>
  );
}

/* ---------- relationship card (incoming / active / sent) ---------- */
function RelationshipCard({
  m,
  children,
  pendingBadge,
}: {
  m: MentorshipItem;
  children: React.ReactNode;
  pendingBadge?: boolean;
}) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "20px", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Link href={`/scholars/${m.counterpart_id}`}><Avatar url={m.counterpart_avatar} name={m.counterpart_name} /></Link>
        <div style={{ minWidth: 0 }}>
          <Link href={`/scholars/${m.counterpart_id}`} style={{ fontSize: 15.5, fontWeight: 700, color: colors.ink }}>{m.counterpart_name}</Link>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: colors.brandDeep, background: colors.tintBlue, padding: "3px 9px", borderRadius: radius.pill, textTransform: "capitalize" }}>
              {m.role === "mentee" ? "Mentor" : "Mentee"}
            </span>
            {pendingBadge && (
              <span style={{ fontSize: 11, fontWeight: 700, color: colors.inkFaint, background: colors.bg, padding: "3px 9px", borderRadius: radius.pill }}>Pending</span>
            )}
            {m.counterpart_sub && <span style={{ fontSize: 12.5, color: colors.inkFaint }}>{m.counterpart_sub}</span>}
          </div>
        </div>
      </div>

      {m.message && (
        <div style={{ fontSize: 13.5, color: colors.inkMuted, marginTop: 14, lineHeight: 1.55, background: colors.bg, borderRadius: radius.md, padding: "11px 13px" }}>
          “{m.message}”
        </div>
      )}

      <div style={{ marginTop: 16 }}>{children}</div>
    </div>
  );
}

/* ---------- mentor directory card ---------- */
function MentorCardView({ m }: { m: MentorCard }) {
  const roleLine = [m.current_position, m.current_employer].filter(Boolean).join(" · ");
  const place = [m.nationality, m.country].filter(Boolean).join(" · ");
  const meta = [m.industry || m.sector, m.years_of_experience ? `${m.years_of_experience} yrs experience` : null].filter(Boolean).join(" · ");

  return (
    <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "20px", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Link href={`/scholars/${m.mentor_id}`}><Avatar url={m.avatar_url} name={m.full_name} size={56} /></Link>
        <div style={{ minWidth: 0 }}>
          <Link href={`/scholars/${m.mentor_id}`} style={{ fontSize: 15.5, fontWeight: 700, color: colors.ink }}>{m.full_name}</Link>
          {roleLine && <div style={{ fontSize: 13, color: colors.inkMuted, marginTop: 2 }}>{roleLine}</div>}
          {place && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12.5, color: colors.inkFaint, marginTop: 3 }}>
              <Icon name="pin" size={13} /> {place}
            </div>
          )}
        </div>
      </div>

      {meta && (
        <div style={{ fontSize: 12, fontWeight: 600, color: colors.brandDeep, background: colors.tintBlue, borderRadius: radius.pill, padding: "4px 11px", marginTop: 14, alignSelf: "flex-start" }}>
          {meta}
        </div>
      )}

      {m.mentorship_topics && (
        <div style={{ fontSize: 13.5, color: colors.inkMuted, marginTop: 12, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", flex: 1 }}>
          {m.mentorship_topics}
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <MentorRequestButton mentorId={m.mentor_id} mentorName={m.full_name} status={m.my_status} />
      </div>
    </div>
  );
}
