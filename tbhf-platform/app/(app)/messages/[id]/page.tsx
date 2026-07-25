import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/profiles";
import { getConversation } from "@/lib/messages";
import MarkRead from "@/components/MarkRead";
import ChatThread from "@/components/ChatThread";
import { colors } from "@/lib/theme";

function initials(name: string): string {
  const p = name.trim().split(/\s+/);
  return (p[0]?.[0] ?? "") + (p[1]?.[0] ?? "");
}

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const convo = await getConversation(id);
  if (!convo) notFound();

  const { other, messages, seenEnabled, reactions } = convo;

  return (
    // Fill exactly the viewport minus the 65px top bar so the composer is
    // always on screen; the message list scrolls internally (ChatScroll).
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "0 32px", width: "100%", height: "calc(100dvh - 65px)", display: "flex", flexDirection: "column" }}>
      <MarkRead conversationId={id} />

      {/* Header */}
      <div style={{ background: colors.bg, paddingTop: 16, paddingBottom: 12, borderBottom: `1px solid ${colors.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/messages" style={{ color: colors.inkMuted, fontSize: 20, fontWeight: 700, lineHeight: 1 }}>‹</Link>
          <Link href={`/scholars/${other.id}`} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {other.avatar_url ? (
              <Image src={other.avatar_url} alt={other.full_name} width={42} height={42} style={{ width: 42, height: 42, borderRadius: 999, objectFit: "cover" }} />
            ) : (
              <div style={{ width: 42, height: 42, borderRadius: 999, background: colors.tintBlueDeep, color: colors.brandDeep, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, textTransform: "uppercase" }}>
                {initials(other.full_name)}
              </div>
            )}
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: colors.ink }}>{other.full_name}</div>
              <div style={{ fontSize: 12, color: colors.inkFaint, textTransform: "capitalize" }}>{other.role === "scholar" ? "Student" : other.role}</div>
            </div>
          </Link>
        </div>
      </div>

      {/* Messages + composer (client shell; owns swipe-to-reply state) */}
      <ChatThread
        conversationId={id}
        currentUserId={user.id}
        otherName={other.full_name}
        messages={messages}
        reactions={reactions}
        seenEnabled={seenEnabled}
      />
    </div>
  );
}
