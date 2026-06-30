"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { EVENT_TYPES, eventTypeIcon } from "@/lib/eventTypes";
import { colors, radius, shadow } from "@/lib/theme";

/**
 * Compact "Filter events" control: a single button that reveals all event
 * categories in a dropdown — keeps the Events tab tidy instead of a long
 * scattered row of chips.
 */
export default function EventTypeFilter({
  selected,
  counts,
}: {
  selected?: string;
  counts: Record<string, number>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function choose(type: string | null) {
    setOpen(false);
    router.push(type ? `/events?type=${encodeURIComponent(type)}` : "/events");
  }

  const active = Boolean(selected);

  return (
    <div ref={wrapRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 9,
          background: active ? colors.brand : "#fff",
          color: active ? "#fff" : colors.ink,
          border: `1.5px solid ${active ? colors.brand : colors.borderStrong}`,
          borderRadius: radius.pill, padding: "9px 16px", fontSize: 13.5, fontWeight: 700,
          cursor: "pointer",
        }}
      >
        <Icon name={active ? eventTypeIcon(selected as string) : "calendar"} size={15} />
        {active ? (selected as string) : "Filter events"}
        <Caret up={open} color={active ? "#fff" : colors.inkFaint} />
      </button>

      {active && (
        <button
          type="button"
          onClick={() => choose(null)}
          style={{ marginLeft: 8, background: "none", border: 0, color: colors.inkFaint, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          Clear
        </button>
      )}

      {open && (
        <div
          style={{
            position: "absolute", top: "calc(100% + 8px)", left: 0, zIndex: 30,
            minWidth: 248, background: "#fff", border: `1px solid ${colors.border}`,
            borderRadius: radius.lg, boxShadow: shadow.card, padding: 6, overflow: "hidden",
          }}
        >
          <Row icon="calendar" label="All events" active={!selected} onClick={() => choose(null)} />
          <div style={{ height: 1, background: colors.border, margin: "5px 8px" }} />
          {EVENT_TYPES.map((t) => (
            <Row
              key={t}
              icon={eventTypeIcon(t)}
              label={t}
              count={counts[t]}
              active={selected === t}
              onClick={() => choose(t)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Row({
  icon, label, count, active, onClick,
}: {
  icon: Parameters<typeof Icon>[0]["name"];
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 11, width: "100%",
        background: active ? colors.tintBlue : "transparent",
        color: active ? colors.brandDeep : colors.ink,
        border: 0, borderRadius: radius.md, padding: "9px 11px",
        fontSize: 14, fontWeight: active ? 700 : 500, cursor: "pointer", textAlign: "left",
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = colors.bg; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      <Icon name={icon} size={16} />
      <span style={{ flex: 1 }}>{label}</span>
      {count ? <span style={{ fontSize: 12, fontWeight: 700, color: colors.inkFaint }}>{count}</span> : null}
      {active ? <Icon name="check" size={15} /> : null}
    </button>
  );
}

function Caret({ up, color }: { up: boolean; color: string }) {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ transform: up ? "rotate(180deg)" : "none", transition: "transform .15s" }}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
