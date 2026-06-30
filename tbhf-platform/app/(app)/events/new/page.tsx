import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getMyRole, getEnumValues } from "@/lib/profiles";
import { getMyCapabilities } from "@/lib/admin";
import EventForm from "@/components/EventForm";
import { colors } from "@/lib/theme";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const role = await getMyRole();
  // Moderators with the events capability publish directly, like admins.
  const caps = role === "admin" ? [] : await getMyCapabilities();
  const isAdmin = role === "admin" || caps.includes("manage_events_resources");

  const { date } = await searchParams;
  const modes = await getEnumValues("event_mode");
  // Prefill the start field (09:00) when arriving from a calendar day.
  const defaultStart = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T09:00` : undefined;

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "32px", width: "100%" }}>
      <Link href="/events" style={{ fontSize: 13.5, color: colors.brand, fontWeight: 600 }}>‹ Back to events</Link>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: colors.ink, margin: "10px 0 4px" }}>
        {isAdmin ? "Create an event" : "Submit an event"}
      </h1>
      <p style={{ fontSize: 14.5, color: colors.inkFaint, margin: "0 0 22px" }}>
        {isAdmin
          ? "Add a workshop, webinar, lecture or networking session to the calendar."
          : "Suggest a workshop, webinar, lecture or networking session. It will be reviewed by an admin before it appears on the calendar."}
      </p>
      <EventForm modes={modes} defaultStart={defaultStart} pendingReview={!isAdmin} />
    </div>
  );
}
