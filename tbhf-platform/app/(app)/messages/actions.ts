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
): Promise<{ error?: string }> {
  const text = body.trim();
  if (!text) return {};

  const supabase = await createClient();
  const { error } = await supabase.rpc("send_message", {
    conv: conversationId,
    body: text,
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
