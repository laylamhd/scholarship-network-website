"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function markNotificationRead(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("member_notifications").update({ is_read: true }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/notifications");
  return {};
}

export async function markAllNotificationsRead(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };
  const { error } = await supabase.from("member_notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
  if (error) return { error: error.message };
  revalidatePath("/notifications");
  return {};
}

export async function deleteNotification(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("member_notifications").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/notifications");
  return {};
}
