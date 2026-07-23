"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { colors, radius } from "@/lib/theme";

type Item = {
  label: string;
  href: string;
  soon?: boolean;
  badgeKey?: "messages" | "notifications";
  icon: React.ReactNode;
};

const ICON = {
  home: (
    <path d="M3 11l9-7 9 7M5 10v9h14v-9" />
  ),
  community: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19c0-3 3-5 5.5-5s5.5 2 5.5 5" />
      <path d="M16 6a3 3 0 0 1 0 6" />
    </>
  ),
  showcase: (
    <>
      <rect x="4" y="4" width="6" height="6" rx="1.5" />
      <rect x="14" y="4" width="6" height="6" rx="1.5" />
      <rect x="4" y="14" width="6" height="6" rx="1.5" />
      <rect x="14" y="14" width="6" height="6" rx="1.5" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-4 3.5-6 7-6s7 2 7 6" />
    </>
  ),
  messages: (
    <>
      <path d="M4 5h16v12H7l-3 3z" />
    </>
  ),
  groups: (
    <>
      <circle cx="8" cy="9" r="2.6" />
      <circle cx="16" cy="9" r="2.6" />
      <path d="M3 19c0-2.6 2.2-4.2 5-4.2s5 1.6 5 4.2" />
      <path d="M13.5 14.9c2.6-.2 5 1.4 5 4.1" />
    </>
  ),
  resources: (
    <>
      <path d="M4 5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      <path d="M13 3v5h5" />
    </>
  ),
  careers: (
    <>
      <rect x="3" y="7.5" width="18" height="12.5" rx="2" />
      <path d="M8.5 7.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5" />
      <path d="M3 12.5h18" />
    </>
  ),
  stories: (
    <>
      <path d="M5 4h9l4 4v12H5z" />
      <path d="M13 4v5h5" />
      <path d="M8.5 13h6M8.5 16.5h6" />
    </>
  ),
  events: (
    <>
      <rect x="3.5" y="5" width="17" height="16" rx="2" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    </>
  ),
  research: (
    <>
      <path d="M9 3h6M10 3v6l-4.5 8a2 2 0 0 0 1.8 3h9.4a2 2 0 0 0 1.8-3L14 9V3" />
      <path d="M7.5 15h9" />
    </>
  ),
  volunteer: (
    <path d="M12 20.4 4.3 12.6a4.6 4.6 0 0 1 6.5-6.5l1.2 1.2 1.2-1.2a4.6 4.6 0 0 1 6.5 6.5z" />
  ),
  alumni: (
    <>
      <path d="M2.5 8.5 12 4.2l9.5 4.3L12 12.8z" />
      <path d="M6.2 10.6V15c0 1.5 2.6 2.7 5.8 2.7s5.8-1.2 5.8-2.7v-4.4" />
      <path d="M21.5 8.7V14" />
    </>
  ),
  notifications: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </>
  ),
  surveys: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <rect x="9" y="2.5" width="6" height="3.5" rx="1" />
      <path d="M9 11h6M9 15h4" />
    </>
  ),
  moderation: (
    <>
      <path d="M12 3 5 6v5c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z" />
      <path d="m9.2 12 2 2 3.6-3.8" />
    </>
  ),
};

const items: Item[] = [
  { label: "Home", href: "/", icon: ICON.home },
  { label: "Community", href: "/community", icon: ICON.community },
  { label: "Groups", href: "/groups", icon: ICON.groups },
  { label: "Resources", href: "/resources", icon: ICON.resources },
  // Mentorship lives inside the Career Center now (a card on /opportunities,
  // like Job / Internship / Fellowship) — it's part of career development.
  { label: "Careers", href: "/opportunities", icon: ICON.careers },
  { label: "Stories", href: "/stories", icon: ICON.stories },
  { label: "Showcase", href: "/showcase", icon: ICON.showcase },
  { label: "Events & Volunteering", href: "/events", icon: ICON.events },
  { label: "Research", href: "/research", icon: ICON.research },
];

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

export default function Sidebar({ name, unread = 0, notifUnread = 0, canModerate = false }: { name: string; unread?: number; notifUnread?: number; canModerate?: boolean }) {
  const pathname = usePathname();
  const settingsOn = pathname.startsWith("/settings");
  const [open, setOpen] = useState(false);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Moderators get a dedicated console link; admins manage from Home instead.
  const navItems: Item[] = canModerate
    ? [...items, { label: "Moderation", href: "/moderate", icon: ICON.moderation }]
    : items;

  return (
    <>
      {/* Mobile-only hamburger toggle (hidden on desktop via CSS) */}
      <button
        type="button"
        className="app-hamburger"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>

      {/* Mobile-only backdrop */}
      <div
        className={`app-sidebar-backdrop${open ? " open" : ""}`}
        onClick={() => setOpen(false)}
        aria-hidden
      />

      <aside
        className={`app-sidebar${open ? " open" : ""}`}
        style={{
          width: 264,
          flexShrink: 0,
          background: "#fff",
          borderInlineEnd: `1px solid ${colors.border}`,
          display: "flex",
          flexDirection: "column",
          padding: "22px 16px",
          height: "100vh",
          position: "sticky",
          top: 0,
        }}
      >
      <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "4px 8px 0", marginBottom: 30 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: "#fff", boxShadow: "0 2px 10px rgba(17,166,214,.18)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          <Image src="/tbhf-mark.png" alt="TBHF" width={34} height={34} style={{ objectFit: "contain" }} />
        </div>
        <div style={{ lineHeight: 1.15, flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>TBHF</div>
          <div style={{ fontSize: 11.5, color: colors.inkFaint, fontWeight: 500 }}>Scholars Network</div>
        </div>
        {/* Mobile-only close button inside the drawer */}
        <button
          type="button"
          className="app-drawer-close"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          style={{ width: 34, height: 34, borderRadius: 9, border: 0, background: colors.bg, color: colors.inkMuted, cursor: "pointer" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {navItems.map((it, i) => {
          const on =
            it.href === "/"
              ? pathname === "/"
              : it.href !== "#" &&
                (pathname.startsWith(it.href) ||
                  // Mentorship is a Career Center section.
                  (it.href === "/opportunities" && pathname.startsWith("/mentorship")));
          const badgeCount = it.badgeKey === "messages" ? unread : it.badgeKey === "notifications" ? notifUnread : 0;
          const showBadge = badgeCount > 0;
          const inner = (
            <>
              <Icon>{it.icon}</Icon>
              <span style={{ flex: 1 }}>{it.label}</span>
              {showBadge && (
                <span style={{ minWidth: 20, height: 20, padding: "0 6px", fontSize: 11.5, fontWeight: 700, color: "#fff", background: colors.brand, borderRadius: radius.pill, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {badgeCount > 99 ? "99+" : badgeCount}
                </span>
              )}
              {it.soon && (
                <span style={{ fontSize: 10.5, fontWeight: 700, color: colors.inkFaint, background: colors.bg, padding: "3px 7px", borderRadius: radius.pill }}>
                  Soon
                </span>
              )}
            </>
          );
          const style: React.CSSProperties = {
            display: "flex",
            alignItems: "center",
            gap: 13,
            border: 0,
            cursor: it.soon ? "default" : "pointer",
            textAlign: "start",
            borderRadius: 11,
            padding: "12px 14px",
            fontSize: 15,
            fontWeight: 600,
            width: "100%",
            background: on ? colors.tintBlue : "transparent",
            color: on ? colors.brandDeep : it.soon ? colors.inkFaint : colors.inkMuted,
          };
          if (it.soon) {
            return (
              <div key={i} style={style}>
                {inner}
              </div>
            );
          }
          return (
            <Link key={i} href={it.href} className="navitem" style={style}>
              {inner}
            </Link>
          );
        })}
      </nav>

      <div style={{ marginTop: "auto", paddingTop: 16, borderTop: `1px solid ${colors.border}`, display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 600, color: colors.ink, padding: "0 0 0 6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
        <Link
          href="/settings"
          aria-label="Settings"
          title="Settings"
          className="navitem"
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 38,
            height: 38,
            borderRadius: radius.pill,
            background: settingsOn ? colors.tintBlue : "transparent",
            color: settingsOn ? colors.brandDeep : colors.inkMuted,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3.2" />
            <path d="M19.4 12c0-.5 0-1-.1-1.5l2-1.6-2-3.4-2.4 1a7.3 7.3 0 0 0-2.6-1.5L13.9 2h-3.8l-.4 2.5A7.3 7.3 0 0 0 7.1 6L4.7 5l-2 3.4 2 1.6c-.1.5-.1 1-.1 1.5s0 1 .1 1.5l-2 1.6 2 3.4 2.4-1c.8.6 1.6 1.1 2.6 1.5l.4 2.5h3.8l.4-2.5c1-.4 1.8-.9 2.6-1.5l2.4 1 2-3.4-2-1.6c.1-.5.1-1 .1-1.5z" />
          </svg>
        </Link>
      </div>
    </aside>
    </>
  );
}
