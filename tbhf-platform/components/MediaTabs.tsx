import Link from "next/link";
import { Icon, type IconName } from "@/components/Icon";
import { colors, radius } from "@/lib/theme";

/**
 * The Media section's top switcher — Showcase and Stories live under one
 * "Media" sidebar tab, and this bar (rendered atop both pages) flips
 * between them.
 */
export default function MediaTabs({ active }: { active: "showcase" | "stories" }) {
  return (
    <div style={{ display: "flex", gap: 5, background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.pill, padding: 5, marginBottom: 22, maxWidth: 420 }}>
      <Tab href="/showcase" on={active === "showcase"} icon="image" label="Showcase" />
      <Tab href="/stories" on={active === "stories"} icon="fileText" label="Stories" />
    </div>
  );
}

function Tab({ href, on, icon, label }: { href: string; on: boolean; icon: IconName; label: string }) {
  return (
    <Link
      href={href}
      className="navitem"
      style={{
        flex: 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: "10px 18px",
        borderRadius: radius.pill,
        fontSize: 14.5,
        fontWeight: 700,
        background: on ? colors.brand : "transparent",
        color: on ? "#fff" : colors.inkMuted,
        textDecoration: "none",
      }}
    >
      <Icon name={icon} size={16} /> {label}
    </Link>
  );
}
