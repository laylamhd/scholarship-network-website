import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";
import type { GroupCategory } from "@/lib/groupCategories";

export { GROUP_CATEGORIES, categoryLabel } from "@/lib/groupCategories";
export type { GroupCategory } from "@/lib/groupCategories";

export type GroupListItem = {
  id: string;
  name: string;
  description: string | null;
  category: GroupCategory;
  member_count: number;
  is_member: boolean;
  created_at: string;
};

export type GroupMember = {
  profile_id: string;
  role: "admin" | "member";
  full_name: string;
  avatar_url: string | null;
  user_role: UserRole;
};

export type GroupDetail = {
  id: string;
  name: string;
  description: string | null;
  category: GroupCategory;
  created_by: string;
  members: GroupMember[];
  memberCount: number;
  isMember: boolean;
  isAdmin: boolean;
};

export async function listGroups(search?: string, category?: string): Promise<GroupListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_groups", {
    p_search: search ?? "",
    p_category: category ?? "",
  });
  if (error) {
    console.error("listGroups:", error.message);
    return [];
  }
  return (data as GroupListItem[]) ?? [];
}

export async function getGroup(id: string): Promise<GroupDetail | null> {
  const supabase = await createClient();

  const { data: group, error } = await supabase
    .from("groups")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !group) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: rows } = await supabase
    .from("group_members")
    .select("profile_id, role, profiles(id, full_name, avatar_url, role)")
    .eq("group_id", id)
    .order("role", { ascending: true });

  const members: GroupMember[] = (rows ?? []).map((r) => {
    const p = r.profiles as unknown as { full_name: string; avatar_url: string | null; role: UserRole } | null;
    return {
      profile_id: r.profile_id as string,
      role: r.role as "admin" | "member",
      full_name: p?.full_name ?? "Scholar",
      avatar_url: p?.avatar_url ?? null,
      user_role: p?.role ?? "scholar",
    };
  });

  const isMember = user ? members.some((m) => m.profile_id === user.id) : false;
  const isAdmin = user ? members.some((m) => m.profile_id === user.id && m.role === "admin") : false;

  return {
    id: group.id as string,
    name: group.name as string,
    description: (group.description as string) ?? null,
    category: group.category as GroupCategory,
    created_by: group.created_by as string,
    members,
    memberCount: members.length,
    isMember,
    isAdmin,
  };
}
