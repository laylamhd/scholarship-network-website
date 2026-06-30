import { createClient } from "@/lib/supabase/server";

export { notificationLink } from "@/lib/notificationLink";

export type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
};

/** The signed-in user's notifications (newest first). */
export async function getMyNotifications(limit = 50): Promise<Notification[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("member_notifications")
    .select("id, type, title, body, entity_type, entity_id, is_read, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) { console.error("getMyNotifications:", error.message); return []; }
  return (data as Notification[]) ?? [];
}

/** Count of unread notifications (for the sidebar badge). */
export async function getUnreadNotificationCount(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("member_notifications")
    .select("*", { count: "exact", head: true })
    .eq("is_read", false);
  if (error) { console.error("getUnreadNotificationCount:", error.message); return 0; }
  return count ?? 0;
}

