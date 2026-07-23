import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";

export type ConversationListItem = {
  conversation_id: string;
  other_id: string;
  other_name: string;
  other_avatar: string | null;
  other_role: UserRole;
  last_body: string | null;
  last_at: string | null;
  unread_count: number;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
  deleted_for_all: boolean;
};

export type OtherParticipant = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
};

/** One emoji's aggregate on a message (phase37). */
export type Reaction = { emoji: string; count: number; mine: boolean };

/** Conversations for the current user (other participant + last message + unread). */
export async function listConversations(): Promise<ConversationListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_my_conversations");
  if (error) {
    console.error("listConversations:", error.message);
    return [];
  }
  return (data as ConversationListItem[]) ?? [];
}

/** Total unread messages for the signed-in user (sidebar badge). */
export async function getUnreadTotal(): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_unread_total");
  if (error) return 0;
  return Number(data ?? 0);
}

/** A single conversation: the other participant + ordered messages. Null if not a member. */
export async function getConversation(
  conversationId: string,
): Promise<{
  other: OtherParticipant;
  messages: Message[];
  seenEnabled: boolean;
  reactions: Record<string, Reaction[]>;
} | null> {
  const supabase = await createClient();

  const { data: parts, error: partsErr } = await supabase
    .from("conversation_participants")
    .select("profile_id, profiles(id, full_name, avatar_url, role)")
    .eq("conversation_id", conversationId);

  if (partsErr || !parts || parts.length === 0) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // RLS only returns rows if we're a member; confirm we're actually in it.
  const mine = parts.some((p) => p.profile_id === user.id);
  if (!mine) return null;

  const otherRow = parts.find((p) => p.profile_id !== user.id);
  const op = (otherRow?.profiles as unknown as OtherParticipant | undefined) ?? null;
  const other: OtherParticipant = op ?? {
    id: otherRow?.profile_id ?? "",
    full_name: "Unknown",
    avatar_url: null,
    role: "scholar",
  };

  // Messages, my "deleted for me" hides, whether "Seen" may be shown
  // (both participants have read receipts on — phase36) and the message
  // reactions (phase37) are all independent — one round trip.
  const [{ data: messages }, { data: hidden }, { data: seenData }, { data: reactionRows }] =
    await Promise.all([
      supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true }),
      supabase.from("message_deletions").select("message_id"),
      supabase.rpc("conversation_seen_enabled", { conv: conversationId }),
      supabase.rpc("list_conversation_reactions", { conv: conversationId }),
    ]);
  const hiddenIds = new Set((hidden ?? []).map((h) => h.message_id as string));
  const visible = ((messages as Message[]) ?? []).filter((m) => !hiddenIds.has(m.id));

  const reactions: Record<string, Reaction[]> = {};
  for (const r of (reactionRows as { message_id: string; emoji: string; cnt: number; mine: boolean }[]) ?? []) {
    (reactions[r.message_id] ??= []).push({ emoji: r.emoji, count: Number(r.cnt), mine: r.mine });
  }

  return { other, messages: visible, seenEnabled: seenData === true, reactions };
}
