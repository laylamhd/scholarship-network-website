"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { ALUMNI_OFFER_KINDS, offerKindIcon } from "@/lib/alumniOffers";
import { colors, radius, shadow } from "@/lib/theme";

/**
 * Compact "Filter offers" control: a single button that reveals every offer
 * kind in a dropdown — keeps the Give back screen tidy instead of a long
 * scattered row of chips (mirrors EventTypeFilter).
 */
export default function OfferKindFilter({
  basePath,
  baseParams = {},
  selected,
  counts,
  totalOpen,
}: {
  basePath: string;
  baseParams?: Record<string, string>;
  selected?: string;
  counts: Record<string, number>;
  totalOpen: number;
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

  function choose(kind: string | null) {
    setOpen(false);
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(baseParams)) sp.set(k, v);
    if (kind) sp.set("kind", kind);
    const s = sp.toString();
    router.push(s ? `${basePath}?${s}` : basePath);
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
        <Icon name={active ? offerKindIcon(selected as string) : "heart"} size={15} />
        {active ? (selected as string) : "Filter offers"}
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
            minWidth: 256, background: "#fff", border: `1px solid ${colors.border}`,
            borderRadius: radius.lg, boxShadow: shadow.card, padding: 6, overflow: "hidden",
          }}
        >
          <Row icon="heart" label="All offers" count={totalOpen} active={!selected} onClick={() => choose(null)} />
          <div style={{ height: 1, background: colors.border, margin: "5px 8px" }} />
          {ALUMNI_OFFER_KINDS.map((k) => (
            <Row
              key={k}
              icon={offerKindIcon(k)}
              label={k}
              count={counts[k]}
              active={selected === k}
              onClick={() => choose(k)}
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
