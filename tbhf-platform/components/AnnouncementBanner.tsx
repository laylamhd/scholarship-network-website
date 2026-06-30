"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { colors, radius } from "@/lib/theme";
import type { Announcement } from "@/lib/admin";

const KEY = "tbhf_dismissed_announcements";

export default function AnnouncementBanner({ items }: { items: Announcement[] }) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try { setDismissed(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch { /* ignore */ }
    setReady(true);
  }, []);

  function dismiss(id: string) {
    const next = [...dismissed, id];
    setDismissed(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }

  if (!ready) return null;
  const visible = items.filter((a) => !dismissed.includes(a.id));
  if (visible.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
      {visible.map((a) => (
        <div key={a.id} style={{ display: "flex", alignItems: "flex-start", gap: 13, background: colors.tintBlue, border: `1px solid ${colors.borderBlue}`, borderRadius: radius.lg, padding: "16px 18px" }}>
          <span style={{ width: 34, height: 34, borderRadius: 10, background: "#fff", color: colors.brandDeep, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="mail" size={18} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: colors.ink }}>{a.title}</div>
            <p style={{ fontSize: 13.5, color: colors.inkMuted, margin: "4px 0 0", lineHeight: 1.5 }}>{a.body}</p>
          </div>
          <button type="button" onClick={() => dismiss(a.id)} aria-label="Dismiss" style={{ background: "none", border: 0, cursor: "pointer", color: colors.inkFaint, flexShrink: 0 }}><Icon name="x" size={18} /></button>
        </div>
      ))}
    </div>
  );
}
