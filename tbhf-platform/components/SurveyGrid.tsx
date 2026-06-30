import Link from "next/link";
import Image from "next/image";
import type { SurveyOverview } from "@/lib/surveys";
import { Icon } from "@/components/Icon";
import { colors, radius } from "@/lib/theme";

function initials(name: string): string {
  const p = name.trim().split(/\s+/);
  return (p[0]?.[0] ?? "") + (p[1]?.[0] ?? "");
}

export default function SurveyGrid({ surveys, userId, emptyLabel }: { surveys: SurveyOverview[]; userId: string; emptyLabel: string }) {
  if (surveys.length === 0) {
    return (
      <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "46px", textAlign: "center", color: colors.inkFaint, fontSize: 14.5 }}>
        <div style={{ marginBottom: 14, opacity: 0.5, display: "flex", justifyContent: "center" }}><Icon name="clipboard" size={38} /></div>
        {emptyLabel}
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
      {surveys.map((s) => {
        const owner = s.author_id === userId;
        const target = owner ? `/surveys/${s.id}/results` : `/surveys/${s.id}`;
        return (
          <Link key={s.id} href={target} className="navitem" style={{ display: "flex", flexDirection: "column", background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: 20, color: "inherit" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 700, padding: "3px 10px", borderRadius: radius.pill, color: s.is_open ? "#0F8F6B" : colors.inkFaint, background: s.is_open ? "#E6F6F0" : colors.bg }}>
                <span style={{ width: 7, height: 7, borderRadius: 999, background: s.is_open ? "#0F8F6B" : colors.inkFaint }} /> {s.is_open ? "Open" : "Closed"}
              </span>
              {s.i_responded && !owner && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 700, color: colors.brandDeep, background: colors.tintBlue, padding: "3px 10px", borderRadius: radius.pill }}>
                  <Icon name="check" size={12} /> Responded
                </span>
              )}
            </div>

            <div style={{ fontSize: 17, fontWeight: 700, color: colors.ink, lineHeight: 1.3, marginBottom: 6 }}>{s.title}</div>
            {s.description && (
              <p style={{ fontSize: 13.5, color: colors.inkMuted, lineHeight: 1.5, margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{s.description}</p>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12.5, color: colors.inkFaint, marginTop: 14 }}>
              <span>{s.question_count} question{s.question_count === 1 ? "" : "s"}</span>
              {owner && <span>· {s.response_count} response{s.response_count === 1 ? "" : "s"}</span>}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${colors.border}` }}>
              {s.author_avatar ? (
                <Image src={s.author_avatar} alt={s.author_name} width={26} height={26} style={{ width: 26, height: 26, borderRadius: 999, objectFit: "cover" }} />
              ) : (
                <span style={{ width: 26, height: 26, borderRadius: 999, background: colors.tintBlueDeep, color: colors.brandDeep, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>{initials(s.author_name)}</span>
              )}
              <span style={{ fontSize: 12.5, color: colors.inkMuted, fontWeight: 600 }}>{owner ? "You" : s.author_name}</span>
              <span style={{ marginInlineStart: "auto", fontSize: 12.5, fontWeight: 700, color: colors.brandDeep }}>{owner ? "View results" : s.i_responded ? "View" : "Respond"} ›</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
