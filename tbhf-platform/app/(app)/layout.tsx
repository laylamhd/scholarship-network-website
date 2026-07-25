import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import NotificationPopup from "@/components/NotificationPopup";
import { getMyBasicProfile } from "@/lib/profiles";
import { getUnreadTotal } from "@/lib/messages";
import { getUnreadNotificationCount, getMyNotifications } from "@/lib/notifications";
import { getMyCapabilities } from "@/lib/admin";
import { colors } from "@/lib/theme";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The shell only needs a name and role — not the full profile with its
  // 8-table fan-out, which every navigation used to pay for.
  const me = await getMyBasicProfile();
  // Proxy already guards this, but be defensive.
  if (!me) redirect("/login");

  const name = me.full_name?.trim() || "Your profile";
  const isAdmin = me.role === "admin";
  const [unread, notifUnread, recent, caps] = await Promise.all([
    getUnreadTotal(),
    getUnreadNotificationCount(),
    getMyNotifications(15),
    // Admins manage from Home; only non-admins need the Moderation entry.
    isAdmin ? Promise.resolve([]) : getMyCapabilities(),
  ]);
  const recentUnread = recent.filter((n) => !n.is_read).slice(0, 6);
  const canModerate = !isAdmin && caps.length > 0;

  // Shell is sized to the DYNAMIC viewport (100dvh), not 100vh. On mobile, 100vh
  // is the *largest* viewport (address bar hidden) and is taller than what's
  // actually visible, so the whole document could scroll by that difference.
  // 100dvh matches the visible area, so `main` is the only scroller — which
  // keeps the messages composer pinned (no page drift).
  return (
    <div style={{ display: "flex", minHeight: "100dvh", background: colors.bg }}>
      <Sidebar name={name} canModerate={canModerate} />
      <main className="scr" style={{ flex: 1, minWidth: 0, height: "100dvh", overflowY: "auto" }}>
        <TopBar unread={unread} notifUnread={notifUnread} notifications={recentUnread} />
        {children}
      </main>
      <NotificationPopup items={recentUnread} />
    </div>
  );
}
