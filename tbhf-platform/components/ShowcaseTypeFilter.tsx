"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { SHOWCASE_TYPES, showcaseTypePlural, showcaseTypeIcon } from "@/lib/showcaseTypes";
import { colors, radius, shadow } from "@/lib/theme";

/**
 * Compact "Filter media" control for the Showcase — a single button that
 * reveals every media type in a dropdown (mirrors the Events filter), instead
 * of a long scattered row of category chips.
 */
export default function ShowcaseTypeFilter({
  selected,
  counts,
  query,
}: {
  selected?: string;
  counts: Map<string, number>;
  query?: string;
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
    const sp = new URLSearchParams();
    if (type) sp.set("type", type);
    if (query) sp.set("q", query);
    const qs = sp.toString();
    router.push(qs ? `/showcase?${qs}` : "/showcase");
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
        <Icon name={active ? showcaseTypeIcon(selected as string) : "image"} size={15} />
        {active ? showcaseTypePlural(selected as string) : "Filter media"}
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
            position: "absolute", top: "calc(100% + 8px)", insetInlineStart: 0, zIndex: 30,
            minWidth: 248, background: "#fff", border: `1px solid ${colors.border}`,
            borderRadius: radius.lg, boxShadow: shadow.card, padding: 6, overflow: "hidden",
          }}
        >
          <Row icon="image" label="All media" active={!selected} onClick={() => choose(null)} />
          <div style={{ height: 1, background: colors.border, margin: "5px 8px" }} />
          {SHOWCASE_TYPES.map((t) => (
            <Row
              key={t}
              icon={showcaseTypeIcon(t)}
              label={showcaseTypePlural(t)}
              count={counts.get(t)}
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
