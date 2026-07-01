import Link from "next/link";
import Image from "next/image";
import type { FullProfile, VolunteerEntry, EmploymentEntry } from "@/lib/types";
import { colors, radius, shadow } from "@/lib/theme";
import FollowButton from "@/components/FollowButton";
import { Icon } from "@/components/Icon";
import { startConversation } from "@/app/(app)/messages/actions";

function initials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}

function fmtMonth(d: string | null): string {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("en-GB", { year: "numeric", month: "short" });
  } catch {
    return d;
  }
}

function HiddenPill() {
  return (
    <span title="Hidden from other scholars" style={{ fontSize: 10.5, fontWeight: 700, color: colors.inkFaint, background: colors.bg, border: `1px solid ${colors.borderStrong}`, padding: "2px 8px", borderRadius: radius.pill }}>
      Hidden
    </span>
  );
}

function Card({ title, hidden, children }: { title?: string; hidden?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "20px 22px" }}>
      {title && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: colors.ink }}>{title}</span>
          {hidden && <HiddenPill />}
        </div>
      )}
      {children}
    </div>
  );
}

function Tags({ items }: { items: string[] }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {items.map((s, i) => (
        <span key={i} style={{ fontSize: 13.5, color: colors.brandDeep, background: colors.tintBlue, padding: "7px 14px", borderRadius: radius.pill, fontWeight: 500 }}>
          {s}
        </span>
      ))}
    </div>
  );
}

function Paragraph({ text }: { text: string }) {
  return <div style={{ fontSize: 14.5, color: colors.inkMuted, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{text}</div>;
}

function Field({ label, value, hidden }: { label: string; value: string; hidden?: boolean }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <span style={{ fontSize: 12, color: colors.inkFaint, fontWeight: 600 }}>{label}</span>
        {hidden && <HiddenPill />}
      </div>
      <div style={{ fontSize: 14.5, color: colors.ink, fontWeight: 600, marginTop: 3 }}>{value}</div>
    </div>
  );
}

function TimelineItem({ title, sub, meta, desc }: { title: string; sub?: string; meta?: string; desc?: string | null }) {
  return (
    <div style={{ borderInlineStart: `3px solid ${colors.tintBlueDeep}`, paddingInlineStart: 14 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: colors.ink }}>{title}</div>
      {sub && <div style={{ fontSize: 13, color: colors.inkMuted }}>{sub}</div>}
      {meta && <div style={{ fontSize: 12, color: colors.inkFaint, marginTop: 2 }}>{meta}</div>}
      {desc && <div style={{ fontSize: 13, color: colors.inkMuted, marginTop: 4, lineHeight: 1.55 }}>{desc}</div>}
    </div>
  );
}

function workRange(e: { start_date: string | null; end_date: string | null; is_current: boolean }): string {
  const start = fmtMonth(e.start_date);
  if (!start) return e.is_current ? "Present" : "";
  return `${start}${e.is_current ? " – present" : e.end_date ? ` – ${fmtMonth(e.end_date)}` : ""}`;
}

export default function ProfileView({ data, isOwn, isFollowing = false, isModerator = false }: { data: FullProfile; isOwn: boolean; isFollowing?: boolean; isModerator?: boolean }) {
  const { profile, academic, skills, languages, interests, alumni, employment, certifications, volunteer } = data;

  // Per-field privacy: owner sees everything; others see a field only if not hidden.
  const show = (key: string) => isOwn || profile.field_privacy?.[key] !== false;
  // For the owner's own view, mark which items are hidden from other scholars.
  const hidden = (key: string) => isOwn && profile.field_privacy?.[key] === false;

  const name = profile.full_name?.trim() || "Unnamed scholar";
  const current = academic.find((a) => a.is_current) ?? academic[0];
  const location = [profile.city, profile.country].filter(Boolean).join(", ");
  const subline = [profile.nationality, current?.institution_name].filter(Boolean).join(" · ");
  const degreeBits = current
    ? [current.field_of_study, current.degree_level, current.year_of_study].filter(Boolean).join(" · ")
    : "";
  const isAlumni = profile.role === "alumni";

  const hasRightContent =
    (show("bio") && profile.bio) ||
    (show("skills") && skills.length > 0) ||
    (show("interests") && interests.length > 0) ||
    (show("career_aspirations") && profile.career_aspirations) ||
    (show("research_interests") && profile.research_interests) ||
    (show("education") && academic.length > 0) ||
    (show("volunteer_experience") && volunteer.length > 0) ||
    (isAlumni && show("professional") && (alumni || employment.length > 0 || certifications.length > 0));

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 32px 80px", width: "100%" }}>
      {isOwn && !hasRightContent && (
        <div style={{ background: colors.tintBlue, border: `1px solid ${colors.borderBlue}`, borderRadius: radius.lg, padding: "14px 18px", fontSize: 14, color: colors.brandDeep, marginBottom: 18 }}>
          Welcome! Your profile is looking empty.{" "}
          <Link href="/profile/edit" style={{ fontWeight: 700, textDecoration: "underline" }}>Complete your profile</Link>{" "}
          so other scholars can find you.
        </div>
      )}

      {/* Cover (contained + rounded so edges align with content) */}
      <div style={{ background: colors.tintBlue, height: 150, borderRadius: radius.lg, position: "relative", zIndex: 0, overflow: "hidden" }}>
        <svg viewBox="0 0 1280 150" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.5 }}>
          <path d="M0 90 C160 55 320 120 480 90 C660 55 820 122 1000 90 C1140 64 1220 96 1280 86" fill="none" stroke="#9FD7EA" strokeWidth="2.5" />
        </svg>
      </div>

      <div className="profile-grid" style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 24, alignItems: "start" }}>
        {/* ---- Left column (raised above the cover so the avatar overlaps cleanly) ---- */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "relative", zIndex: 2 }}>
          <Card>
            <div style={{ marginTop: -68 }}>
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={name}
                  width={104}
                  height={104}
                  style={{ width: 104, height: 104, borderRadius: 999, objectFit: "cover", border: "4px solid #fff", boxShadow: shadow.avatar, display: "block" }}
                />
              ) : (
                <div style={{ width: 104, height: 104, borderRadius: 999, background: colors.tintBlueDeep, color: colors.brandDeep, border: "4px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, fontWeight: 700, boxShadow: shadow.avatar, textTransform: "uppercase" }}>
                  {initials(profile.full_name)}
                </div>
              )}
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: colors.ink }}>{name}</div>
              {subline && <div style={{ fontSize: 14, color: colors.inkSoft, marginTop: 4 }}>{subline}</div>}
              {degreeBits && <div style={{ fontSize: 14, color: colors.brand, fontWeight: 600, marginTop: 3 }}>{degreeBits}</div>}
              {show("location") && location && (
                <div style={{ fontSize: 13.5, color: colors.inkFaint, marginTop: 5, display: "flex", alignItems: "center", gap: 5 }}>
                  <Icon name="pin" size={14} /><span>{location}</span>{hidden("location") && <HiddenPill />}
                </div>
              )}
              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: colors.brandDeep, background: colors.tintBlue, padding: "4px 10px", borderRadius: radius.pill, textTransform: "capitalize" }}>
                  {profile.role === "scholar" ? "Student" : profile.role}
                </span>
                {isModerator && (
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: "#5B3E9B", background: "#EEE8F9", padding: "4px 10px", borderRadius: radius.pill }}>Moderator</span>
                )}
                {isAlumni && alumni?.willing_to_mentor && (
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: "#8A6D3B", background: "#FBF0E6", padding: "4px 10px", borderRadius: radius.pill }}>Open to mentoring</span>
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              {isOwn ? (
                <Link href="/profile/edit" style={{ flex: 1, textAlign: "center", background: colors.brand, color: "#fff", borderRadius: radius.pill, padding: "11px", fontSize: 14.5, fontWeight: 700, boxShadow: shadow.brand }}>Edit profile</Link>
              ) : (
                <>
                  <FollowButton targetId={profile.id} initialFollowing={isFollowing} block />
                  <form action={startConversation.bind(null, profile.id)} style={{ flex: 1, display: "flex" }}>
                    <button type="submit" style={{ flex: 1, background: "#fff", color: colors.ink, border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.pill, padding: "11px", fontSize: 14.5, fontWeight: 600, cursor: "pointer" }}>Message</button>
                  </form>
                </>
              )}
            </div>
          </Card>

          {((show("nationality") && profile.nationality) || (show("phone") && profile.phone)) && (
            <Card title="Details">
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {show("nationality") && profile.nationality && <Field label="Nationality" value={profile.nationality} hidden={hidden("nationality")} />}
                {show("phone") && profile.phone && <Field label="Phone" value={profile.phone} hidden={hidden("phone")} />}
              </div>
            </Card>
          )}

          {show("languages") && languages.length > 0 && <Card title="Languages" hidden={hidden("languages")}><Tags items={languages} /></Card>}
        </div>

        {/* ---- Right column ---- */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {!hasRightContent && !isOwn && (
            <Card><div style={{ fontSize: 14, color: colors.inkFaint }}>This scholar hasn’t shared any public details yet.</div></Card>
          )}

          {show("bio") && profile.bio && <Card title="Biography" hidden={hidden("bio")}><Paragraph text={profile.bio} /></Card>}
          {show("skills") && skills.length > 0 && <Card title="Skills" hidden={hidden("skills")}><Tags items={skills} /></Card>}
          {show("interests") && interests.length > 0 && <Card title="Interests" hidden={hidden("interests")}><Tags items={interests} /></Card>}
          {show("career_aspirations") && profile.career_aspirations && <Card title="Career aspirations" hidden={hidden("career_aspirations")}><Paragraph text={profile.career_aspirations} /></Card>}
          {show("research_interests") && profile.research_interests && <Card title="Research interests" hidden={hidden("research_interests")}><Paragraph text={profile.research_interests} /></Card>}

          {show("education") && academic.length > 0 && (
            <Card title="Education" hidden={hidden("education")}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {academic.map((a, i) => (
                  <TimelineItem
                    key={a.id ?? i}
                    title={a.institution_name}
                    sub={[a.field_of_study, a.degree_level, a.year_of_study].filter(Boolean).join(" · ")}
                    meta={`${a.country_of_study} · ${a.start_year}${a.is_current ? " – present" : a.end_year ? ` – ${a.end_year}` : ""}${a.gpa ? ` · GPA ${a.gpa}` : ""}`}
                  />
                ))}
              </div>
            </Card>
          )}

          {show("volunteer_experience") && volunteer.length > 0 && (
            <Card title="Volunteer experience" hidden={hidden("volunteer_experience")}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {volunteer.map((v: VolunteerEntry, i) => (
                  <TimelineItem
                    key={v.id ?? i}
                    title={v.role || v.organization}
                    sub={v.role ? v.organization : undefined}
                    meta={workRange(v)}
                    desc={v.description}
                  />
                ))}
              </div>
            </Card>
          )}

          {isAlumni && show("professional") && (alumni || employment.length > 0 || certifications.length > 0) && (
            <Card title="Professional" hidden={hidden("professional")}>
              {alumni && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: employment.length || certifications.length ? 18 : 0 }}>
                  {alumni.current_position && <Field label="Position" value={alumni.current_position} />}
                  {alumni.current_employer && <Field label="Employer" value={alumni.current_employer} />}
                  {alumni.seniority_level && <Field label="Seniority" value={alumni.seniority_level} />}
                  {alumni.sector && <Field label="Sector" value={alumni.sector} />}
                  {alumni.industry && <Field label="Industry" value={alumni.industry} />}
                  {alumni.linkedin_url && (
                    <div>
                      <div style={{ fontSize: 12, color: colors.inkFaint, fontWeight: 600 }}>LinkedIn</div>
                      <a href={alumni.linkedin_url} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 14, color: colors.brand, fontWeight: 600 }}>View profile <Icon name="externalLink" size={13} /></a>
                    </div>
                  )}
                </div>
              )}

              {employment.length > 0 && (
                <>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: colors.inkMuted, margin: "4px 0 10px" }}>Employment history</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {employment.map((e: EmploymentEntry, i) => (
                      <TimelineItem key={e.id ?? i} title={e.job_title} sub={e.company_name} meta={workRange(e)} desc={e.description} />
                    ))}
                  </div>
                </>
              )}

              {certifications.length > 0 && (
                <>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: colors.inkMuted, margin: "18px 0 10px" }}>Certifications</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {certifications.map((c, i) => (
                      <span key={c.id ?? i} style={{ fontSize: 13, color: colors.ink, background: colors.bg, border: `1px solid ${colors.border}`, padding: "7px 13px", borderRadius: radius.pill }}>
                        {c.title}{c.issuing_org ? ` · ${c.issuing_org}` : ""}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </Card>
          )}
        </div>
      </div>

      <style>{`@media (max-width: 900px){ .profile-grid{ grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}
