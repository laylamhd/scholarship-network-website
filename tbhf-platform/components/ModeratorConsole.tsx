"use client";

import { useState } from "react";
import Link from "next/link";
import ContentModeration from "@/components/ContentModeration";
import AnnouncementsManager from "@/components/AnnouncementsManager";
import { Icon, type IconName } from "@/components/Icon";
import { colors, radius } from "@/lib/theme";
import { MODERATOR_CAPS, type ModeratorCapability } from "@/lib/moderators";
import type { PendingCounts, Announcement } from "@/lib/admin";

type Tab = "content" | "announcements";

const CONTENT_CARDS: { entity: keyof PendingCounts; label: string; icon: IconName }[] = [
  { entity: "stories", label: "Stories", icon: "fileText" },
  { entity: "research_posts", label: "Research posts", icon: "flask" },
  { entity: "community_projects", label: "Community projects", icon: "heart" },
  { entity: "showcase_items", label: "Showcase items", icon: "image" },
  { entity: "events", label: "Events", icon: "calendar" },
  { entity: "alumni_offers", label: "Alumni offers", icon: "handshake" },
];

// Capabilities that are exercised inline on their own pages, not in this console.
const INLINE_AREAS: { cap: ModeratorCapability; href: string; cta: string }[] = [
  { cap: "manage_events_resources", href: "/events", cta: "Manage events" },
  { cap: "manage_events_resources", href: "/resources", cta: "Manage the library" },
  { cap: "manage_communities", href: "/community", cta: "Manage communities" },
];

export default function ModeratorConsole({
  firstName,
  caps,
  pending,
  announcements,
}: {
  firstName: string;
  caps: ModeratorCapability[];
  pending: PendingCounts | null;
  announcements: Announcement[];
}) {
  const canContent = caps.includes("moderate_content");
  const canAnnounce = caps.includes("manage_announcements");

  const tabs: { id: Tab; label: string; icon: IconName }[] = [];
  if (canContent) tabs.push({ id: "content", label: "Content review", icon: "clipboard" });
  if (canAnnounce) tabs.push({ id: "announcements", label: "Announcements", icon: "mail" });

  const [tab, setTab] = useState<Tab>(tabs[0]?.id ?? "content");
  const [review, setReview] = useState<{ entity: string; label: string } | null>(null);

  const inline = INLINE_AREAS.filter((a) => caps.includes(a.cap));

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 32, width: "100%" }}>
      <div style={{ marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span style={{ width: 34, height: 34, borderRadius: 9, background: colors.tintBlue, color: colors.brandDeep, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="shield" size={19} />
          </span>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: colors.ink, margin: 0 }}>Moderation</h1>
        </div>
        <p style={{ fontSize: 14, color: colors.inkMuted, margin: "8px 0 0" }}>
          Welcome back, {firstName}. You have moderator access to the areas below.
        </p>
      </div>

      {tabs.length > 0 && (
        <div style={{ display: "flex", gap: 6, borderBottom: `1px solid ${colors.border}`, marginBottom: 24 }}>
          {tabs.map((t) => {
            const on = tab === t.id;
            return (
              <button key={t.id} type="button" onClick={() => setTab(t.id)} style={{
                display: "flex", alignItems: "center", gap: 8, background: "none", border: 0, cursor: "pointer",
                padding: "10px 14px", marginBottom: -1, fontSize: 14.5, fontWeight: 700,
                color: on ? colors.brandDeep : colors.inkMuted, borderBottom: `2.5px solid ${on ? colors.brand : "transparent"}`,
              }}>
                <Icon name={t.icon} size={17} /> {t.label}
              </button>
            );
          })}
        </div>
      )}

      {tab === "content" && canContent && (
        <div>
          <p style={{ fontSize: 13, color: colors.inkFaint, margin: "0 0 14px" }}>
            Click a card to review what members have submitted and approve or reject it.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 14 }}>
            {CONTENT_CARDS.map((c) => {
              const count = pending?.[c.entity] ?? 0;
              return (
                <button key={c.entity} type="button" onClick={() => setReview({ entity: c.entity, label: c.label })}
                  style={{ textAlign: "left", cursor: "pointer", position: "relative", background: "#fff", border: `1.5px solid ${count > 0 ? "#F2D49B" : colors.border}`, borderRadius: radius.lg, padding: "16px 18px", display: "flex", alignItems: "center", gap: 13 }}>
                  <span style={{ width: 40, height: 40, borderRadius: 10, background: colors.tintBlue, color: colors.brandDeep, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon name={c.icon} size={20} />
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: colors.ink }}>{c.label}</div>
                    <div style={{ fontSize: 12.5, color: colors.inkFaint, fontWeight: 600, marginTop: 3 }}>
                      {count > 0 ? `${count} awaiting review` : "Up to date"}
                    </div>
                  </div>
                  {count > 0 ? (
                    <span style={{ flexShrink: 0, fontSize: 11.5, fontWeight: 800, color: "#fff", background: "#E0922E", borderRadius: radius.pill, padding: "3px 9px" }}>{count}</span>
                  ) : (
                    <Icon name="check" size={16} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {tab === "announcements" && canAnnounce && <AnnouncementsManager items={announcements} />}

      {inline.length > 0 && (
        <div style={{ marginTop: 34, paddingTop: 22, borderTop: `1px solid ${colors.border}` }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: colors.ink, margin: "0 0 4px" }}>Your other areas</h3>
          <p style={{ fontSize: 13, color: colors.inkFaint, margin: "0 0 14px" }}>
            You also moderate these directly on their own pages.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {inline.map((a) => {
              const meta = MODERATOR_CAPS.find((m) => m.key === a.cap);
              return (
                <Link key={a.href} href={a.href} className="navitem"
                  style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", border: `1.5px solid ${colors.border}`, borderRadius: radius.lg, padding: "12px 16px", color: colors.ink, fontWeight: 700, fontSize: 13.5 }}>
                  <Icon name={meta?.icon ?? "users"} size={18} /> {a.cta}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {review && <ContentModeration entity={review.entity} label={review.label} onClose={() => setReview(null)} />}
    </div>
  );
}
