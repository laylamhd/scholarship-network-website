"use client";

import { useState, type ReactNode } from "react";
import { colors } from "@/lib/theme";

export type CommunityTab = {
  key: string;
  label: string;
  count?: number;
  panel: ReactNode;
};

export default function CommunityTabs({ tabs }: { tabs: CommunityTab[] }) {
  const [active, setActive] = useState(tabs[0]?.key ?? "");
  const current = tabs.find((t) => t.key === active) ?? tabs[0];

  return (
    <div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", borderBottom: `1px solid ${colors.border}`, marginBottom: 18 }}>
        {tabs.map((t) => {
          const on = t.key === active;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActive(t.key)}
              style={{
                background: "none",
                border: 0,
                borderBottom: `2.5px solid ${on ? colors.brand : "transparent"}`,
                padding: "10px 14px",
                marginBottom: -1,
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                color: on ? colors.brandDeep : colors.inkMuted,
                display: "flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              {t.label}
              {typeof t.count === "number" && (
                <span style={{ fontSize: 11.5, fontWeight: 700, color: on ? colors.brandDeep : colors.inkFaint, background: on ? colors.tintBlue : colors.bg, padding: "1px 8px", borderRadius: 999 }}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div>{current?.panel}</div>
    </div>
  );
}
