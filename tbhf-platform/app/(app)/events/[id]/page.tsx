import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, getMyRole } from "@/lib/profiles";
import { getMyCapabilities } from "@/lib/admin";
import { getEvent } from "@/lib/events";
import { safeUrl } from "@/lib/safeUrl";
import { eventTypeIcon, formatMode, isOnlineMode } from "@/lib/eventTypes";
import EventRsvpButton from "@/components/EventRsvpButton";
import EventDeleteButton from "@/components/EventDeleteButton";
import { Icon } from "@/components/Icon";
import { colors, radius, shadow } from "@/lib/theme";

function fmtRange(startIso: string, endIso: string | null): string {
  const start = new Date(startIso);
  const opts: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long", year: "numeric" };
  const date = start.toLocaleDateString("en-GB", opts);
  const startTime = start.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  if (!endIso) return `${date} · ${startTime}`;
  const end = new Date(endIso);
  const sameDay = start.toDateString() === end.toDateString();
  const endTime = end.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return sameDay
    ? `${date} · ${startTime} – ${endTime}`
    : `${date} ${startTime} – ${end.toLocaleDateString("en-GB", opts)} ${endTime}`;
}

function InfoRow({ icon, children }: { icon: Parameters<typeof Icon>[0]["name"]; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11, fontSize: 14.5, color: colors.ink }}>
      <span style={{ width: 36, height: 36, borderRadius: 10, background: colors.tintBlue, color: colors.brandDeep, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon name={icon} size={18} />
      </span>
      {children}
    </div>
  );
}

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [event, role] = await Promise.all([getEvent(id, user.id), getMyRole()]);
  if (!event) notFound();
  const caps = role === "admin" ? [] : await getMyCapabilities();
  const isAdmin = role === "admin" || caps.includes("manage_events_resources");
  const past = new Date(event.end_at ?? event.start_at).getTime() < Date.now();

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "32px", width: "100%" }}>
      <Link href="/events" style={{ fontSize: 13.5, color: colors.brand, fontWeight: 600 }}>‹ All events</Link>

      {event.review_status !== "approved" && (
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", background: event.review_status === "rejected" ? "#FDEDEC" : "#FBF6E9", border: `1px solid ${event.review_status === "rejected" ? "#F5C6C0" : "#EBD9A8"}`, color: event.review_status === "rejected" ? "#A33" : "#8A6D3B", padding: "12px 15px", borderRadius: radius.md, margin: "16px 0 0", fontSize: 13.5, lineHeight: 1.5 }}>
          <span style={{ flexShrink: 0, marginTop: 1 }}><Icon name="clock" size={17} /></span>
          {event.review_status === "rejected"
            ? "This event was not approved by an admin, so it isn't visible to the network."
            : "This event is awaiting admin approval. Only you and admins can see it until it's approved."}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", margin: "16px 0 12px" }}>
        {event.event_type && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: colors.brandDeep, background: colors.tintBlue, padding: "4px 12px", borderRadius: radius.pill }}>
            <Icon name={eventTypeIcon(event.event_type)} size={14} /> {event.event_type}
          </span>
        )}
        <span style={{ fontSize: 12, fontWeight: 700, color: colors.inkMuted, background: colors.bg, padding: "4px 12px", borderRadius: radius.pill }}>{formatMode(event.mode)}</span>
        {past && <span style={{ fontSize: 12, fontWeight: 700, color: "#8A6D3B", background: "#FBF0E6", padding: "4px 12px", borderRadius: radius.pill }}>Ended</span>}
      </div>

      <h1 style={{ fontSize: 30, fontWeight: 800, color: colors.ink, margin: "0 0 18px", lineHeight: 1.2 }}>{event.title}</h1>

      {event.cover_image_url && (
        <div style={{ position: "relative", width: "100%", height: 360, borderRadius: radius.lg, overflow: "hidden", marginBottom: 22, boxShadow: shadow.card, background: colors.tintBlue }}>
          <Image src={event.cover_image_url} alt={event.title} fill style={{ objectFit: "cover" }} priority />
        </div>
      )}

      {/* Key info */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "20px 22px", marginBottom: 22 }}>
        <InfoRow icon="calendar">{fmtRange(event.start_at, event.end_at)}</InfoRow>
        {event.location && <InfoRow icon="pin">{event.location}</InfoRow>}
        <InfoRow icon="users">{event.going_count} {event.going_count === 1 ? "person" : "people"} going</InfoRow>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        {past ? (
          event.recording_url ? (
            <a href={safeUrl(event.recording_url)} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 7, background: colors.brand, color: "#fff", borderRadius: radius.pill, padding: "11px 22px", fontSize: 14.5, fontWeight: 700, boxShadow: shadow.brand }}>
              <Icon name="play" size={16} /> Watch recording
            </a>
          ) : (
            <span style={{ fontSize: 14, color: colors.inkFaint }}>This event has ended.</span>
          )
        ) : (
          <>
            <EventRsvpButton eventId={event.id} initialStatus={event.my_status} />
            {event.registration_link && (
              <a href={safeUrl(event.registration_link)} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "#fff", color: colors.brandDeep, border: `1.5px solid ${colors.borderBlue}`, borderRadius: radius.pill, padding: "11px 22px", fontSize: 14.5, fontWeight: 700 }}>
                <Icon name="ticket" size={16} /> Register
              </a>
            )}
            {isOnlineMode(event.mode) && event.online_link && (
              <a href={safeUrl(event.online_link)} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "#fff", color: colors.brandDeep, border: `1.5px solid ${colors.borderBlue}`, borderRadius: radius.pill, padding: "11px 22px", fontSize: 14.5, fontWeight: 700 }}>
                <Icon name="externalLink" size={16} /> Join online
              </a>
            )}
          </>
        )}
      </div>

      {event.description && (
        <p style={{ fontSize: 16, color: colors.ink, lineHeight: 1.75, whiteSpace: "pre-wrap", margin: "0 0 24px" }}>{event.description}</p>
      )}

      {isAdmin && (
        <div style={{ display: "flex", gap: 10, paddingTop: 20, borderTop: `1px solid ${colors.border}` }}>
          <EventDeleteButton eventId={event.id} />
        </div>
      )}
    </div>
  );
}
