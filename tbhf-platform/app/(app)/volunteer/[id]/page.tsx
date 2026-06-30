import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/profiles";
import { getProject, getProjectVolunteers } from "@/lib/volunteer";
import { causeIcon, causeColor, statusLabel } from "@/lib/volunteerCauses";
import { startConversation } from "@/app/(app)/messages/actions";
import VolunteerButton from "@/components/VolunteerButton";
import LogHoursButton from "@/components/LogHoursButton";
import OutcomeForm from "@/components/OutcomeForm";
import ProjectDeleteButton from "@/components/ProjectDeleteButton";
import { Icon } from "@/components/Icon";
import { colors, radius, shadow } from "@/lib/theme";

function initials(name: string): string {
  const p = name.trim().split(/\s+/);
  return (p[0]?.[0] ?? "") + (p[1]?.[0] ?? "");
}
function fmtDate(d: string | null): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const project = await getProject(id, user.id);
  if (!project) notFound();
  const isOwner = project.organizer_id === user.id;
  const volunteers = await getProjectVolunteers(project.id);
  const accent = causeColor(project.cause);
  const dates = [fmtDate(project.start_date), fmtDate(project.end_date)].filter(Boolean).join(" – ");

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "32px", width: "100%" }}>
      <Link href="/volunteer" style={{ fontSize: 13.5, color: colors.brand, fontWeight: 600 }}>‹ All projects</Link>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", margin: "16px 0 12px" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: accent, background: `${accent}18`, padding: "4px 12px", borderRadius: radius.pill }}>
          <Icon name={causeIcon(project.cause)} size={14} /> {project.cause}
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, color: colors.inkMuted, background: colors.bg, padding: "4px 12px", borderRadius: radius.pill }}>{statusLabel(project.status)}</span>
      </div>

      <h1 style={{ fontSize: 29, fontWeight: 800, color: colors.ink, margin: "0 0 16px", lineHeight: 1.2 }}>{project.title}</h1>

      {project.image_url && (
        <div style={{ position: "relative", width: "100%", height: 320, borderRadius: radius.lg, overflow: "hidden", marginBottom: 20, boxShadow: shadow.card, background: `${accent}14` }}>
          <Image src={project.image_url} alt={project.title} fill style={{ objectFit: "cover" }} priority />
        </div>
      )}

      {/* meta + organizer */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 18, fontSize: 13.5, color: colors.inkMuted }}>
        <Link href={`/scholars/${project.organizer_id}`} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          {project.organizer_avatar ? (
            <Image src={project.organizer_avatar} alt={project.organizer_name} width={30} height={30} style={{ width: 30, height: 30, borderRadius: 999, objectFit: "cover" }} />
          ) : (
            <span style={{ width: 30, height: 30, borderRadius: 999, background: colors.tintBlueDeep, color: colors.brandDeep, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>{initials(project.organizer_name)}</span>
          )}
          <span style={{ fontWeight: 600, color: colors.ink }}>{project.organizer_name}</span>
        </Link>
        {project.location && <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="pin" size={14} /> {project.location}</span>}
        {dates && <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="calendar" size={14} /> {dates}</span>}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        {!isOwner && project.status !== "completed" && (
          <VolunteerButton projectId={project.id} initialJoined={project.i_volunteer} count={project.volunteer_count} />
        )}
        {(project.i_volunteer || isOwner) && (
          <LogHoursButton fixedProjectId={project.id} fixedProjectTitle={project.title} variant={isOwner && project.status !== "completed" ? "ghost" : "solid"} />
        )}
      </div>

      {/* Description */}
      <div style={{ fontSize: 16, color: colors.ink, lineHeight: 1.75, whiteSpace: "pre-wrap", marginBottom: 24 }}>{project.description}</div>

      {/* Outcome (shared) */}
      {project.outcome && (
        <div style={{ background: "#E6F6F0", border: "1px solid #BBE6D6", borderRadius: radius.lg, padding: "18px 22px", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: "#0F8F6B", marginBottom: 6 }}>
            <Icon name="sparkle" size={16} /> Project outcome
          </div>
          <div style={{ fontSize: 15, color: colors.ink, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{project.outcome}</div>
        </div>
      )}

      {/* Volunteers */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: colors.ink, margin: "0 0 12px" }}>
          Volunteers{volunteers.length > 0 ? ` (${volunteers.length})` : ""}
        </h2>
        {volunteers.length === 0 ? (
          <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "20px", textAlign: "center", color: colors.inkFaint, fontSize: 14 }}>No volunteers yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {volunteers.map((v) => (
              <div key={v.profile_id} style={{ display: "flex", alignItems: "center", gap: 12, background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "12px 16px" }}>
                <Link href={`/scholars/${v.profile_id}`}>
                  {v.avatar_url ? (
                    <Image src={v.avatar_url} alt={v.full_name} width={36} height={36} style={{ width: 36, height: 36, borderRadius: 999, objectFit: "cover" }} />
                  ) : (
                    <span style={{ width: 36, height: 36, borderRadius: 999, background: colors.tintBlueDeep, color: colors.brandDeep, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, textTransform: "uppercase" }}>{initials(v.full_name)}</span>
                  )}
                </Link>
                <Link href={`/scholars/${v.profile_id}`} style={{ flex: 1, fontSize: 14.5, fontWeight: 700, color: colors.ink }}>{v.full_name}</Link>
                {isOwner && v.profile_id !== user.id && (
                  <form action={startConversation.bind(null, v.profile_id)}>
                    <button type="submit" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: colors.tintBlue, color: colors.brandDeep, border: `1.5px solid ${colors.borderBlue}`, borderRadius: radius.pill, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                      <Icon name="chat" size={14} /> Message
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Organizer controls */}
      {isOwner && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 20, borderTop: `1px solid ${colors.border}` }}>
          <OutcomeForm projectId={project.id} initialOutcome={project.outcome} initialStatus={project.status} />
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Link href={`/volunteer/${project.id}/edit`} style={{ background: colors.tintBlue, color: colors.brandDeep, border: `1.5px solid ${colors.borderBlue}`, borderRadius: radius.pill, padding: "8px 18px", fontSize: 13, fontWeight: 700 }}>Edit</Link>
            <ProjectDeleteButton projectId={project.id} />
          </div>
        </div>
      )}
    </div>
  );
}
