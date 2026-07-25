"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Open (or create) a DM with another scholar, then go to the thread. */
export async function startConversation(otherId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase.rpc("get_or_create_dm", { other: otherId });
  if (error) {
    console.error("startConversation:", error.message);
    redirect("/messages");
  }
  redirect(`/messages/${data as string}`);
}

export async function sendMessage(
  conversationId: string,
  body: string,
  replyTo?: string | null,
): Promise<{ error?: string }> {
  const text = body.trim();
  if (!text) return {};

  const supabase = await createClient();
  const { error } = await supabase.rpc("send_message", {
    conv: conversationId,
    body: text,
    reply_to: replyTo ?? null,
  });
  if (error) return { error: error.message };

  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/messages");
  return {};
}

export async function markConversationRead(conversationId: string) {
  const supabase = await createClient();
  await supabase.rpc("mark_conversation_read", { conv: conversationId });
  revalidatePath("/messages");
}

/** React to a message (phase37). Same emoji toggles off; a new one replaces. */
export async function reactToMessage(
  conversationId: string,
  messageId: string,
  emoji: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("react_to_message", {
    msg: messageId,
    em: emoji,
  });
  if (error) return { error: error.message };

  revalidatePath(`/messages/${conversationId}`);
  return {};
}

/** Hide a message from just my own view ("Delete for me"). */
export async function deleteMessageForMe(
  conversationId: string,
  messageId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_message_for_me", { msg: messageId });
  if (error) return { error: error.message };

  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/messages");
  return {};
}

/** Mark a message deleted for both participants ("Delete for everyone"). Sender only. */
export async function deleteMessageForEveryone(
  conversationId: string,
  messageId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_message_for_everyone", { msg: messageId });
  if (error) return { error: error.message };

  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/messages");
  return {};
}
