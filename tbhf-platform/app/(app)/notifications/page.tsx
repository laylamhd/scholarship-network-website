import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/profiles";
import { getMyNotifications } from "@/lib/notifications";
import NotificationsList from "@/components/NotificationsList";
import { Icon } from "@/components/Icon";
import { colors, radius, gradients } from "@/lib/theme";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const items = await getMyNotifications();

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px", width: "100%" }}>
      <div style={{ background: gradients.hero, borderRadius: radius.lg, padding: "26px 30px", color: "#fff", marginBottom: 26, display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ width: 50, height: 50, borderRadius: 15, background: "rgba(255,255,255,.18)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon name="mail" size={26} />
        </span>
        <div>
          <h1 style={{ fontSize: 25, fontWeight: 700, margin: 0 }}>Notifications</h1>
          <p style={{ fontSize: 14.5, opacity: 0.92, margin: "4px 0 0" }}>Updates on your content, reviews and announcements.</p>
        </div>
      </div>

      <NotificationsList items={items} />
    </div>
  );
}
