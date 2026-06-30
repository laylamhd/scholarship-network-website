import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/profiles";
import { listConversations } from "@/lib/messages";
import { colors, radius } from "@/lib/theme";

function initials(name: string): string {
  const p = name.trim().split(/\s+/);
  return (p[0]?.[0] ?? "") + (p[1]?.[0] ?? "");
}

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso).getTime();
  const mins = Math.round((Date.now() - d) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default async function MessagesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const conversations = await listConversations();

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "32px", width: "100%" }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: colors.ink, margin: "0 0 6px" }}>Messages</h1>
      <p style={{ fontSize: 14.5, color: colors.inkFaint, margin: "0 0 22px" }}>
        Your direct conversations with other scholars.
      </p>

      {conversations.length === 0 ? (
        <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "40px", textAlign: "center", color: colors.inkFaint, fontSize: 14.5 }}>
          No conversations yet. Open a scholar’s profile from{" "}
          <Link href="/community" style={{ color: colors.brand, fontWeight: 600 }}>Community</Link>{" "}
          and tap <strong>Message</strong> to start one.
        </div>
      ) : (
        <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, overflow: "hidden" }}>
          {conversations.map((c, i) => (
            <Link
              key={c.conversation_id}
              href={`/messages/${c.conversation_id}`}
              style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", borderTop: i === 0 ? "none" : `1px solid ${colors.border}`, background: c.unread_count > 0 ? colors.tintBlue : "#fff" }}
            >
              {c.other_avatar ? (
                <Image src={c.other_avatar} alt={c.other_name} width={48} height={48} style={{ width: 48, height: 48, borderRadius: 999, objectFit: "cover" }} />
              ) : (
                <div style={{ width: 48, height: 48, borderRadius: 999, background: colors.tintBlueDeep, color: colors.brandDeep, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 700, textTransform: "uppercase" }}>
                  {initials(c.other_name)}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: colors.ink }}>{c.other_name}</span>
                  <span style={{ fontSize: 12, color: colors.inkFaint, flexShrink: 0 }}>{timeAgo(c.last_at)}</span>
                </div>
                <div style={{ fontSize: 13.5, color: c.unread_count > 0 ? colors.ink : colors.inkFaint, fontWeight: c.unread_count > 0 ? 600 : 400, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.last_body ?? "No messages yet"}
                </div>
              </div>
              {c.unread_count > 0 && (
                <span style={{ flexShrink: 0, minWidth: 20, height: 20, padding: "0 6px", borderRadius: 999, background: colors.brand, color: "#fff", fontSize: 11.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {c.unread_count}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
