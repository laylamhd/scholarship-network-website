import { redirect } from "next/navigation";
import { getMyFullProfile } from "@/lib/profiles";
import { getMyCapabilities, getPendingCounts, getAnnouncements } from "@/lib/admin";
import ModeratorConsole from "@/components/ModeratorConsole";

export default async function ModeratePage() {
  const data = await getMyFullProfile();
  if (!data) redirect("/login");

  // Admins manage everything from their Home dashboard; this console is for moderators.
  if (data.profile.role === "admin") redirect("/");

  const caps = await getMyCapabilities();
  if (caps.length === 0) redirect("/");

  const firstName = (data.profile.full_name || "there").split(/\s+/)[0];

  // Fetch only what the granted capabilities actually need.
  const [pending, announcements] = await Promise.all([
    caps.includes("moderate_content") ? getPendingCounts() : Promise.resolve(null),
    caps.includes("manage_announcements") ? getAnnouncements() : Promise.resolve([]),
  ]);

  return (
    <ModeratorConsole
      firstName={firstName}
      caps={caps}
      pending={pending}
      announcements={announcements}
    />
  );
}
