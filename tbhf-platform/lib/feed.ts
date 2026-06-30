import { createClient } from "@/lib/supabase/server";

export type FeedAuthor = {
  id: string;
  full_name: string;
  avatar_url: string | null;
};

export type FeedComment = {
  id: string;
  content: string;
  created_at: string;
  author: FeedAuthor;
};

export type FeedPost = {
  id: string;
  content: string;
  created_at: string;
  author: FeedAuthor;
  like_count: number;
  liked: boolean;
  comments: FeedComment[];
};

/** A group's discussion feed (members only; returns [] for non-members). */
export async function getGroupFeed(groupId: string): Promise<FeedPost[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_group_feed", { p_group: groupId });
  if (error) {
    console.error("getGroupFeed:", error.message);
    return [];
  }
  return (data as FeedPost[]) ?? [];
}
