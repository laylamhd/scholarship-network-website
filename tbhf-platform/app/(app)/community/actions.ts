"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type FollowResult = { ok: boolean; following: boolean; error?: string };

export async function followScholar(targetId: string): Promise<FollowResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, following: false, error: "Not signed in." };
  if (user.id === targetId) return { ok: false, following: false, error: "You can’t follow yourself." };

  const { error } = await supabase
    .from("follows")
    .upsert(
      { follower_id: user.id, following_id: targetId, status: "active" },
      { onConflict: "follower_id,following_id" },
    );

  if (error) return { ok: false, following: false, error: error.message };

  revalidatePath("/community");
  revalidatePath("/");
  return { ok: true, following: true };
}

export async function unfollowScholar(targetId: string): Promise<FollowResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, following: true, error: "Not signed in." };

  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", user.id)
    .eq("following_id", targetId);

  if (error) return { ok: false, following: true, error: error.message };

  revalidatePath("/community");
  revalidatePath("/");
  return { ok: true, following: false };
}

// ============================================================
// Communities (admin-managed). Creation + membership are admin-only,
// enforced by the SECURITY DEFINER RPCs (which check is_admin()).
// ============================================================

export type CreateCommunityState = { error?: string } | null;

export async function createCommunity(
  _prev: CreateCommunityState,
  formData: FormData,
): Promise<CreateCommunityState> {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const accent = String(formData.get("accent") ?? "").trim();

  if (!name) return { error: "Please give the community a name." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_create_community", {
    p_name: name,
    p_description: description,
    p_accent: accent || null,
  });
  if (error) return { error: error.message };

  revalidatePath("/community");
  redirect(`/community/${data as string}`);
}

export async function addCommunityMember(communityId: string, profileId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_add_community_member", {
    p_community: communityId,
    p_profile: profileId,
  });
  if (error) return { error: error.message };
  revalidatePath(`/community/${communityId}`);
  return {};
}

export async function removeCommunityMember(communityId: string, profileId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_remove_community_member", {
    p_community: communityId,
    p_profile: profileId,
  });
  if (error) return { error: error.message };
  revalidatePath(`/community/${communityId}`);
  return {};
}

export async function deleteCommunity(communityId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_delete_community", { p_community: communityId });
  if (error) return { error: error.message };
  revalidatePath("/community");
  redirect("/community");
}

export async function createCommunityPost(communityId: string, content: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_community_post", {
    p_community: communityId,
    p_content: content,
  });
  if (error) return { error: error.message };
  revalidatePath(`/community/${communityId}`);
  return {};
}

export async function deleteCommunityPost(communityId: string, postId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_community_post", { p_post: postId });
  if (error) return { error: error.message };
  revalidatePath(`/community/${communityId}`);
  return {};
}

export async function addCommunityComment(postId: string, content: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("add_community_comment", {
    p_post: postId,
    p_content: content,
  });
  if (error) return { error: error.message };
  revalidatePath("/community", "layout");
  return {};
}

export async function toggleCommunityLike(postId: string): Promise<{ error?: string; liked?: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("toggle_community_like", { p_post: postId });
  if (error) return { error: error.message };
  return { liked: data as boolean };
}

export async function searchAddableProfiles(
  communityId: string,
  search: string,
): Promise<{ id: string; full_name: string; email: string | null; role: string; avatar_url: string | null }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_addable_profiles", {
    p_community: communityId,
    p_search: search ?? "",
  });
  if (error) return [];
  return (data as { id: string; full_name: string; email: string | null; role: string; avatar_url: string | null }[]) ?? [];
}
