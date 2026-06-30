"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { markNotificationRead } from "@/app/(app)/notifications/actions";
import { notificationLink } from "@/lib/notificationLink";
import type { Notification } from "@/lib/notifications";
import { Icon, type IconName } from "@/components/Icon";
import { colors, radius, shadow } from "@/lib/theme";

// Once-per-session memory of which notifications we've already popped, so the
// welcome-back card doesn't reappear on every navigation within the same visit.
const SEEN_KEY = "tbhf:notif-popup:seen";

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

function readSeen(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SEEN_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export default function NotificationPopup({ items }: { items: Notification[] }) {
  const router = useRouter();
  const [shown, setShown] = useState<Notification[]>([]);

  // On first entry to the platform this session, show whichever unread
  // notifications we haven't popped yet, then remember them.
  useEffect(() => {
    if (items.length === 0) return;
    const seen = readSeen();
    const fresh = items.filter((n) => !seen.has(n.id));
    if (fresh.length === 0) return;

    // One-shot on mount: sessionStorage can only be read on the client (reading
    // it during render would cause a hydration mismatch), so this single
    // setState is intentional, not a cascading render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShown(fresh);
    items.forEach((n) => seen.add(n.id));
    try {
      sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
    } catch {
      /* sessionStorage unavailable — show once, no persistence */
    }
    // Mount-only: capture the unread set present when the user arrived.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (shown.length === 0) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setShown([]);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shown.length]);

  if (shown.length === 0) return null;

  function close() {
    setShown([]);
  }

  function open(n: Notification) {
    const link = notificationLink(n);
    close();
    void markNotificationRead(n.id);
    if (link) router.push(link);
    else router.refresh();
  }

  return (
    <div
      onClick={close}
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(33,45,55,.45)",
        backdropFilter: "saturate(180%) blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 80,
        padding: 20,
        animation: "tbhfFade .18s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="New notifications"
        style={{
          background: "#fff",
          borderRadius: radius.lg,
          boxShadow: shadow.card,
          width: "100%",
          maxWidth: 440,
          overflow: "hidden",
          animation: "tbhfPop .2s cubic-bezier(.2,.8,.3,1.1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "20px 22px 16px" }}>
          <span style={{ width: 40, height: 40, borderRadius: 11, background: colors.tintBlue, color: colors.brandDeep, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name="bell" size={20} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: colors.ink }}>Welcome back</div>
            <div style={{ fontSize: 13.5, color: colors.inkMuted, marginTop: 2 }}>
              You have {shown.length} new notification{shown.length === 1 ? "" : "s"} while you were away.
            </div>
          </div>
          <button type="button" onClick={close} aria-label="Close" style={{ background: "none", border: 0, cursor: "pointer", color: colors.inkFaint, flexShrink: 0 }}>
            <Icon name="x" size={20} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", maxHeight: 320, overflowY: "auto", borderTop: `1px solid ${colors.border}` }}>
          {shown.map((n) => {
            const m = meta(n.type);
            const link = notificationLink(n);
            return (
              <div
                key={n.id}
                onClick={() => open(n)}
                className="navitem"
                style={{ display: "flex", alignItems: "flex-start", gap: 11, padding: "13px 22px", borderBottom: `1px solid ${colors.border}`, cursor: link ? "pointer" : "default" }}
              >
                <span style={{ width: 34, height: 34, borderRadius: 10, background: `${m.accent}16`, color: m.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon name={m.icon} size={17} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: colors.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.title}</div>
                  {n.body && (
                    <div style={{ fontSize: 12.5, color: colors.inkMuted, lineHeight: 1.45, marginTop: 2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{n.body}</div>
                  )}
                  <div style={{ fontSize: 11.5, color: colors.inkFaint, marginTop: 4 }}>{timeAgo(n.created_at)}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 10, padding: "14px 22px" }}>
          <Link
            href="/notifications"
            onClick={close}
            style={{ flex: 1, textAlign: "center", padding: "10px 16px", fontSize: 13.5, fontWeight: 700, color: "#fff", background: colors.brand, borderRadius: radius.pill, textDecoration: "none", boxShadow: shadow.brand }}
          >
            View all
          </Link>
          <button
            type="button"
            onClick={close}
            style={{ padding: "10px 18px", fontSize: 13.5, fontWeight: 700, color: colors.inkMuted, background: "#fff", border: `1.5px solid ${colors.border}`, borderRadius: radius.pill, cursor: "pointer" }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
