import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import NotificationPopup from "@/components/NotificationPopup";
import { getMyFullProfile } from "@/lib/profiles";
import { getUnreadTotal } from "@/lib/messages";
import { getUnreadNotificationCount, getMyNotifications } from "@/lib/notifications";
import { getMyCapabilities } from "@/lib/admin";
import { colors } from "@/lib/theme";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const data = await getMyFullProfile();
  // Proxy already guards this, but be defensive.
  if (!data) redirect("/login");

  const name = data.profile.full_name?.trim() || "Your profile";
  const isAdmin = data.profile.role === "admin";
  const [unread, notifUnread, recent, caps] = await Promise.all([
    getUnreadTotal(),
    getUnreadNotificationCount(),
    getMyNotifications(15),
    // Admins manage from Home; only non-admins need the Moderation entry.
    isAdmin ? Promise.resolve([]) : getMyCapabilities(),
  ]);
  const recentUnread = recent.filter((n) => !n.is_read).slice(0, 6);
  const canModerate = !isAdmin && caps.length > 0;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: colors.bg }}>
      <Sidebar name={name} canModerate={canModerate} />
      <main className="scr" style={{ flex: 1, minWidth: 0, height: "100vh", overflowY: "auto" }}>
        <TopBar unread={unread} notifUnread={notifUnread} notifications={recentUnread} />
        {children}
      </main>
      <NotificationPopup items={recentUnread} />
    </div>
  );
}
