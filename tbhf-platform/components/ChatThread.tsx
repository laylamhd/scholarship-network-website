"use client";

import { useMemo, useState } from "react";
import ChatScroll from "@/components/ChatScroll";
import MessageBubble, { type BubbleReaction, type QuotedPreview } from "@/components/MessageBubble";
import MessageComposer, { type ReplyTarget } from "@/components/MessageComposer";
import { colors } from "@/lib/theme";

type ThreadMessage = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
  deleted_for_all: boolean;
  reply_to: string | null;
};

/**
 * Client shell for a conversation: owns the "replying to" state so a swipe (or
 * the Reply menu item) on any bubble flows into the composer, and resolves each
 * reply's quoted preview from the messages already on the page.
 */
export default function ChatThread({
  conversationId,
  currentUserId,
  otherName,
  messages,
  reactions,
  seenEnabled,
}: {
  conversationId: string;
  currentUserId: string;
  otherName: string;
  messages: ThreadMessage[];
  reactions: Record<string, BubbleReaction[]>;
  seenEnabled: boolean;
}) {
  const [replyTo, setReplyTo] = useState<ReplyTarget>(null);

  const byId = useMemo(() => {
    const m = new Map<string, ThreadMessage>();
    for (const msg of messages) m.set(msg.id, msg);
    return m;
  }, [messages]);

  const authorOf = (senderId: string) => (senderId === currentUserId ? "You" : otherName);

  const quotedFor = (msg: ThreadMessage): QuotedPreview => {
    if (!msg.reply_to) return null;
    const src = byId.get(msg.reply_to);
    if (!src) return null;
    return {
      author: authorOf(src.sender_id),
      body: src.deleted_for_all ? "This message was deleted" : src.body,
    };
  };

  return (
    <>
      <ChatScroll count={messages.length}>
        {messages.length === 0 ? (
          <div style={{ textAlign: "center", color: colors.inkFaint, fontSize: 14, padding: "40px 0" }}>
            No messages yet — say hello.
          </div>
        ) : (
          messages.map((m) => (
            <MessageBubble
              key={m.id}
              conversationId={conversationId}
              id={m.id}
              body={m.body}
              createdAt={m.created_at}
              mine={m.sender_id === currentUserId}
              deletedForAll={m.deleted_for_all}
              readAt={m.read_at}
              showSeen={seenEnabled}
              reactions={reactions[m.id] ?? []}
              quoted={quotedFor(m)}
              onReply={() =>
                setReplyTo({
                  id: m.id,
                  author: authorOf(m.sender_id),
                  body: m.deleted_for_all ? "This message was deleted" : m.body,
                })
              }
            />
          ))
        )}
      </ChatScroll>

      <MessageComposer conversationId={conversationId} replyTo={replyTo} onClearReply={() => setReplyTo(null)} />
      <div style={{ height: 14, flexShrink: 0 }} />
    </>
  );
}
