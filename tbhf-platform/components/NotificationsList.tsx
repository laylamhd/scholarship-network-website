"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { markNotificationRead, markAllNotificationsRead, deleteNotification } from "@/app/(app)/notifications/actions";
import { notificationLink } from "@/lib/notificationLink";
import type { Notification } from "@/lib/notifications";
import { Icon, type IconName } from "@/components/Icon";
import { colors, radius, shadow } from "@/lib/theme";

function meta(type: string): { icon: IconName; accent: string } {
  switch (type) {
    case "review_approved": return { icon: "check", accent: "#0F8F6B" };
    case "review_rejected": return { icon: "x", accent: "#D9534F" };
    case "review_pending": return { icon: "clock", accent: "#E0922E" };
    case "new_message": return { icon: "chat", accent: colors.brand };
    case "new_follower": return { icon: "users", accent: "#7A5AF8" };
    case "community_comment": return { icon: "chat", accent: colors.brand };
    case "community_like": return { icon: "heart", accent: "#E0517A" };
    case "mentorship_request": return { icon: "handshake", accent: "#7A5AF8" };
    case "mentorship_accepted": return { icon: "check", accent: "#0F8F6B" };
    case "mentorship_declined": return { icon: "x", accent: "#D9534F" };
    case "event_update": return { icon: "calendar", accent: "#E0922E" };
    case "event_reminder": return { icon: "clock", accent: "#E0922E" };
    case "event_recording": return { icon: "play", accent: colors.brand };
    case "announcement": return { icon: "bell", accent: colors.brand };
    default: return { icon: "mail", accent: colors.brand };
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function NotificationsList({ items }: { items: Notification[] }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const unread = items.filter((n) => !n.is_read).length;

  function open(n: Notification) {
    const link = notificationLink(n);
    start(async () => {
      if (!n.is_read) await markNotificationRead(n.id);
      if (link) router.push(link);
      else router.refresh();
    });
  }

  if (items.length === 0) {
    return (
      <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "48px", textAlign: "center", color: colors.inkFaint, fontSize: 14.5 }}>
        You&apos;re all caught up — no notifications yet.
      </div>
    );
  }

  return (
    <div>
      {unread > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
          <button type="button" disabled={pending} onClick={() => start(async () => { await markAllNotificationsRead(); router.refresh(); })}
            style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "#fff", color: colors.brandDeep, border: `1.5px solid ${colors.borderBlue}`, borderRadius: radius.pill, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            <Icon name="check" size={14} /> Mark all read
          </button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((n) => {
          const m = meta(n.type);
          const link = notificationLink(n);
          return (
            <div key={n.id} style={{ display: "flex", alignItems: "flex-start", gap: 13, background: n.is_read ? "#fff" : colors.tintBlue, border: `1px solid ${n.is_read ? colors.border : colors.borderBlue}`, borderRadius: radius.lg, padding: "15px 17px", boxShadow: n.is_read ? "none" : shadow.card }}>
              <span style={{ width: 36, height: 36, borderRadius: 10, background: `${m.accent}16`, color: m.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon name={m.icon} size={18} />
              </span>
              <div style={{ flex: 1, minWidth: 0, cursor: link ? "pointer" : "default" }} onClick={() => (link || !n.is_read) && open(n)}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 700, color: colors.ink }}>{n.title}</span>
                  {!n.is_read && <span style={{ width: 8, height: 8, borderRadius: 999, background: colors.brand, flexShrink: 0 }} />}
                </div>
                {n.body && <p style={{ fontSize: 13.5, color: colors.inkMuted, margin: "4px 0 0", lineHeight: 1.5 }}>{n.body}</p>}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 7 }}>
                  <span style={{ fontSize: 12, color: colors.inkFaint }}>{timeAgo(n.created_at)}</span>
                  {link && <span style={{ fontSize: 12.5, color: colors.brandDeep, fontWeight: 700 }}>View ›</span>}
                </div>
              </div>
              <button type="button" disabled={pending} onClick={() => start(async () => { await deleteNotification(n.id); router.refresh(); })} aria-label="Dismiss" style={{ background: "none", border: 0, cursor: "pointer", color: colors.inkFaint, flexShrink: 0 }}>
                <Icon name="x" size={17} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
