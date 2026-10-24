import Image from "next/image";
import { colors, radius, shadow } from "@/lib/theme";

/** Centered card used by the password-reset pages (same look as the sign-in form). */
export default function AuthCard({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: colors.bg, padding: "48px 20px" }}>
      <div style={{ width: "100%", maxWidth: 440, background: colors.surface, borderRadius: radius.lg, boxShadow: shadow.avatar, padding: "36px 32px" }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: colors.tintBlue, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
          <Image src="/tbhf-mark.png" alt="TBHF" width={40} height={40} style={{ objectFit: "contain" }} />
        </div>
        <div style={{ fontSize: 14.5, color: colors.inkFaint, marginBottom: 6 }}>{eyebrow}</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: colors.ink, margin: "0 0 20px" }}>{title}</h1>
        {children}
      </div>
    </div>
  );
}

export const fieldStyle: React.CSSProperties = {
  width: "100%", padding: "14px 16px", fontSize: 15, color: colors.ink, background: "#fff",
  border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.md, outline: "none",
};
export const labelStyle: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 600, color: colors.inkMuted, marginBottom: 7 };
export const buttonStyle = (pending: boolean): React.CSSProperties => ({
  width: "100%", marginTop: 20, padding: "14px", fontSize: 15.5, fontWeight: 700, color: "#fff",
  background: colors.brand, border: 0, borderRadius: radius.pill, cursor: pending ? "default" : "pointer",
  opacity: pending ? 0.7 : 1, boxShadow: shadow.brand,
});
export const errorBox: React.CSSProperties = { fontSize: 13.5, color: "#C0392B", background: "#FDEDEC", border: "1px solid #F5C6C0", padding: "10px 13px", borderRadius: radius.sm, marginTop: 14 };
export const noticeBox: React.CSSProperties = { fontSize: 13.5, color: "#1E6B4E", background: "#E8F6EF", border: "1px solid #B6E3CD", padding: "12px 14px", borderRadius: radius.sm, marginTop: 14, lineHeight: 1.5 };
