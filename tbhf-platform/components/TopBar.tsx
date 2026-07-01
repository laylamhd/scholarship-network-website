"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { colors, radius, shadow } from "@/lib/theme";
import { Icon, type IconName } from "@/components/Icon";

const ICON = {
  profile: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-4 3.5-6 7-6s7 2 7 6" />
    </>
  ),
  messages: <path d="M4 5h16v12H7l-3 3z" />,
  notifications: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </>
  ),
};

type NotifPreview = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  created_at: string;
};

function notifMeta(type: string): { icon: IconName; accent: string } {
  switch (type) {
    case "review_approved": return { icon: "check", accent: "#0F8F6B" };
    case "review_rejected": return { icon: "x", accent: "#D9534F" };
    case "review_pending": return { icon: "clock", accent: "#E0922E" };
    case "new_message": return { icon: "chat", accent: colors.brand };
    case "new_follower": return { icon: "users", accent: "#7A5AF8" };
    case "community_comment": return { icon: "chat", accent: colors.brand };
    case "community_like": return { icon: "heart", accent: "#E0517A" };
    case "mention": return { icon: "users", accent: "#7A5AF8" };
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

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      style={{
        position: "absolute",
        top: 2,
        insetInlineEnd: 2,
        minWidth: 17,
        height: 17,
        padding: "0 4px",
        fontSize: 10.5,
        fontWeight: 700,
        color: "#fff",
        background: colors.brand,
        border: "2px solid #fff",
        borderRadius: radius.pill,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

const iconBtn = (on: boolean): React.CSSProperties => ({
  position: "relative",
  width: 40,
  height: 40,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: radius.pill,
  background: on ? colors.tintBlue : "transparent",
  color: on ? colors.brandDeep : colors.inkMuted,
});

export default function TopBar({
  unread = 0,
  notifUnread = 0,
  notifications = [],
}: {
  unread?: number;
  notifUnread?: number;
  notifications?: NotifPreview[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function show() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }
  function hide() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 140);
  }

  const onMessages = pathname.startsWith("/messages");
  const onNotifs = pathname.startsWith("/notifications");
  const onProfile = pathname.startsWith("/profile");

  return (
    <header
      className="app-topbar"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 6,
        padding: "12px 24px",
        background: "rgba(255,255,255,.85)",
        backdropFilter: "saturate(180%) blur(8px)",
        borderBottom: `1px solid ${colors.border}`,
      }}
    >
      {/* Messages */}
      <Link href="/messages" aria-label="Messages" title="Messages" className="navitem" style={iconBtn(onMessages)}>
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          {ICON.messages}
        </svg>
        <Badge count={unread} />
      </Link>

      {/* Notifications + hover preview */}
      <div style={{ position: "relative" }} onMouseEnter={show} onMouseLeave={hide}>
        <Link href="/notifications" aria-label="Notifications" title="Notifications" className="navitem" style={iconBtn(onNotifs)}>
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            {ICON.notifications}
          </svg>
          <Badge count={notifUnread} />
        </Link>

        {open && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              insetInlineEnd: 0,
              width: 340,
              background: "#fff",
              border: `1px solid ${colors.border}`,
              borderRadius: radius.lg,
              boxShadow: shadow.card,
              overflow: "hidden",
              zIndex: 40,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", borderBottom: `1px solid ${colors.border}` }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: colors.ink }}>Notifications</span>
              {notifUnread > 0 && (
                <span style={{ fontSize: 12, fontWeight: 700, color: colors.brandDeep }}>{notifUnread} unread</span>
              )}
            </div>

            {notifications.length === 0 ? (
              <div style={{ padding: "26px 18px", textAlign: "center", fontSize: 13.5, color: colors.inkFaint }}>
                You&apos;re all caught up.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", maxHeight: 360, overflowY: "auto" }}>
                {notifications.map((n) => {
                  const m = notifMeta(n.type);
                  return (
                    <Link
                      key={n.id}
                      href="/notifications"
                      className="navitem"
                      style={{ display: "flex", alignItems: "flex-start", gap: 11, padding: "12px 16px", borderBottom: `1px solid ${colors.border}`, color: "inherit", textDecoration: "none" }}
                    >
                      <span style={{ width: 32, height: 32, borderRadius: 9, background: `${m.accent}16`, color: m.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Icon name={m.icon} size={16} />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: colors.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.title}</div>
                        {n.body && (
                          <div style={{ fontSize: 12.5, color: colors.inkMuted, lineHeight: 1.45, marginTop: 2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{n.body}</div>
                        )}
                        <div style={{ fontSize: 11.5, color: colors.inkFaint, marginTop: 4 }}>{timeAgo(n.created_at)}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            <Link
              href="/notifications"
              className="navitem"
              style={{ display: "block", textAlign: "center", padding: "12px 16px", fontSize: 13, fontWeight: 700, color: colors.brandDeep, textDecoration: "none" }}
            >
              View all notifications
            </Link>
          </div>
        )}
      </div>

      {/* Profile */}
      <Link href="/profile" aria-label="Profile" title="Profile" className="navitem" style={iconBtn(onProfile)}>
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          {ICON.profile}
        </svg>
      </Link>
    </header>
  );
}
