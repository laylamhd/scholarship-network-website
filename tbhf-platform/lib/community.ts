import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";

export type ScholarCard = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  nationality: string | null;
  country: string | null;
  isFollowing: boolean;
};

/** Ids the given user currently follows (status = active). */
export async function getFollowingIds(userId: string): Promise<Set<string>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId)
    .eq("status", "active");
  return new Set((data ?? []).map((r) => r.following_id as string));
}

/** Whether `userId` follows `targetId`. */
export async function isFollowing(userId: string, targetId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", userId)
    .eq("following_id", targetId)
    .eq("status", "active")
    .maybeSingle();
  return Boolean(data);
}

/**
 * Discoverable scholars in the network (RLS already hides private profiles),
 * excluding the viewer, optionally filtered by a name/nationality search.
 */
export async function listScholars(
  viewerId: string,
  q?: string,
): Promise<ScholarCard[]> {
  const supabase = await createClient();

  let query = supabase
    .from("profiles")
    .select("id, full_name, avatar_url, role, nationality, country")
    .eq("is_active", true)
    .neq("id", viewerId)
    .order("full_name", { ascending: true })
    .limit(60);

  const term = q?.trim();
  if (term) {
    query = query.or(
      `full_name.ilike.%${term}%,nationality.ilike.%${term}%,country.ilike.%${term}%`,
    );
  }

  const [{ data, error }, followingIds] = await Promise.all([
    query,
    getFollowingIds(viewerId),
  ]);

  if (error) {
    console.error("listScholars:", error.message);
    return [];
  }

  return (data ?? []).map((p) => ({
    id: p.id as string,
    full_name: (p.full_name as string) ?? "Unnamed scholar",
    avatar_url: (p.avatar_url as string) ?? null,
    role: p.role as UserRole,
    nationality: (p.nationality as string) ?? null,
    country: (p.country as string) ?? null,
    isFollowing: followingIds.has(p.id as string),
  }));
}
