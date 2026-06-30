"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function deleteGroupPost(
  groupId: string,
  postId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_group_post", { p_post: postId });
  if (error) return { error: error.message };
  revalidatePath(`/groups/${groupId}`);
  return {};
}

export async function deleteGroup(groupId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_group", { p_group: groupId });
  if (error) return { error: error.message };
  revalidatePath("/groups");
  redirect("/groups");
}

export async function createGroupPost(
  groupId: string,
  content: string,
): Promise<{ error?: string }> {
  const text = content.trim();
  if (!text) return {};
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_group_post", { p_group: groupId, p_content: text });
  if (error) return { error: error.message };
  revalidatePath(`/groups/${groupId}`);
  return {};
}

export async function addComment(
  groupId: string,
  postId: string,
  content: string,
): Promise<{ error?: string }> {
  const text = content.trim();
  if (!text) return {};
  const supabase = await createClient();
  const { error } = await supabase.rpc("add_post_comment", { p_post: postId, p_content: text });
  if (error) return { error: error.message };
  revalidatePath(`/groups/${groupId}`);
  return {};
}

export async function toggleLike(
  groupId: string,
  postId: string,
): Promise<{ error?: string; liked?: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("toggle_post_like", { p_post: postId });
  if (error) return { error: error.message };
  revalidatePath(`/groups/${groupId}`);
  return { liked: data as boolean };
}
