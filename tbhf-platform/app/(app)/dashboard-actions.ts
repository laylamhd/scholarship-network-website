"use server";

import { createClient } from "@/lib/supabase/server";
import type { WidgetConfig } from "@/components/DashboardBoard";

/** Read the signed-in user's saved dashboard layout (null if never customized). */
export async function getDashboardLayout(): Promise<WidgetConfig[] | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("dashboard_layout")
    .eq("id", auth.user.id)
    .maybeSingle();
  const layout = data?.dashboard_layout;
  return Array.isArray(layout) ? (layout as WidgetConfig[]) : null;
}

/** Persist the user's dashboard layout (own-row RLS handles authorization). */
export async function saveDashboardLayout(
  layout: WidgetConfig[],
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Not signed in." };
  const { error } = await supabase
    .from("profiles")
    .update({ dashboard_layout: layout })
    .eq("id", auth.user.id);
  if (error) return { error: error.message };
  return {};
}
