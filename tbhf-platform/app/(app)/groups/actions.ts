"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CreateGroupState = { error?: string } | null;

export async function createGroup(
  _prev: CreateGroupState,
  formData: FormData,
): Promise<CreateGroupState> {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "thematic");

  if (!name) return { error: "Please give your group a name." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_group", {
    p_name: name,
    p_description: description,
    p_category: category,
  });
  if (error) return { error: error.message };

  revalidatePath("/groups");
  redirect(`/groups/${data as string}`);
}

export async function joinGroup(groupId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("group_members")
    .upsert(
      { group_id: groupId, profile_id: user.id, role: "member" },
      { onConflict: "group_id,profile_id" },
    );
  if (error) return { error: error.message };

  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/groups");
  return {};
}

export async function leaveGroup(groupId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("profile_id", user.id);
  if (error) return { error: error.message };

  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/groups");
  return {};
}
