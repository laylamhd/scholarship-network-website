import { redirect } from "next/navigation";

// Volunteering is now merged into the Events & Volunteering hub (/events).
// Preserve any incoming filters (status / cause / search) on the way through.
export default async function VolunteerPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cause?: string; status?: string }>;
}) {
  const { q, cause, status } = await searchParams;
  const sp = new URLSearchParams({ tab: "volunteering" });
  if (q) sp.set("q", q);
  if (cause) sp.set("cause", cause);
  if (status) sp.set("status", status);
  redirect(`/events?${sp.toString()}`);
}
