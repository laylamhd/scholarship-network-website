import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";
import type { FeedPost } from "@/lib/feed";

export type CommunityListItem = {
  id: string;
  name: string;
  description: string | null;
  accent: string | null;
  member_count: number;
  post_count: number;
  is_member: boolean;
  created_at: string;
};

export type CommunityMember = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  joined_at: string;
};

export type CommunityDetail = {
  id: string;
  name: string;
  description: string | null;
  accent: string | null;
  created_at: string;
  is_admin: boolean;
  can_delete: boolean;
  member_count: number;
  post_count: number;
  members: CommunityMember[];
};

export type MemberContentItem = {
  entity_type: string;
  id: string;
  title: string;
  author_id: string;
  author_name: string;
  author_avatar: string | null;
  created_at: string;
};

export type AddableProfile = {
  id: string;
  full_name: string;
  email: string | null;
  role: string;
  avatar_url: string | null;
};

export async function listCommunities(search?: string): Promise<CommunityListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_communities", { p_search: search ?? "" });
  if (error) {
    console.error("listCommunities:", error.message);
    return [];
  }
  return (data as CommunityListItem[]) ?? [];
}

export async function getCommunity(id: string): Promise<CommunityDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_community", { p_community: id });
  if (error) {
    console.error("getCommunity:", error.message);
    return null;
  }
  return (data as CommunityDetail) ?? null;
}

export async function getCommunityFeed(id: string): Promise<FeedPost[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_community_feed", { p_community: id });
  if (error) {
    console.error("getCommunityFeed:", error.message);
    return [];
  }
  return (data as FeedPost[]) ?? [];
}

export async function getCommunityMemberContent(id: string): Promise<MemberContentItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_community_member_content", { p_community: id });
  if (error) {
    console.error("getCommunityMemberContent:", error.message);
    return [];
  }
  return (data as MemberContentItem[]) ?? [];
}

export async function listAddableProfiles(communityId: string, search?: string): Promise<AddableProfile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_addable_profiles", {
    p_community: communityId,
    p_search: search ?? "",
  });
  if (error) {
    console.error("listAddableProfiles:", error.message);
    return [];
  }
  return (data as AddableProfile[]) ?? [];
}
