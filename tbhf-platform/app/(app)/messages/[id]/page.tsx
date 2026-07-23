import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/profiles";
import { getConversation } from "@/lib/messages";
import MessageComposer from "@/components/MessageComposer";
import MessageBubble from "@/components/MessageBubble";
import MarkRead from "@/components/MarkRead";
import ChatScroll from "@/components/ChatScroll";
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

      {/* Messages — internal scroller pinned to the newest message */}
      <ChatScroll count={messages.length}>
        {messages.length === 0 ? (
          <div style={{ textAlign: "center", color: colors.inkFaint, fontSize: 14, padding: "40px 0" }}>
            No messages yet — say hello.
          </div>
        ) : (
          messages.map((m) => (
            <MessageBubble
              key={m.id}
              conversationId={id}
              id={m.id}
              body={m.body}
              createdAt={m.created_at}
              mine={m.sender_id === user.id}
              deletedForAll={m.deleted_for_all}
              readAt={m.read_at}
              showSeen={seenEnabled}
              reactions={reactions[m.id] ?? []}
            />
          ))
        )}
      </ChatScroll>

      <MessageComposer conversationId={id} />
      <div style={{ height: 14, flexShrink: 0 }} />
    </div>
  );
}
