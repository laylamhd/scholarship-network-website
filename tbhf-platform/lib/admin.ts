import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Moderator, ModeratorCapability } from "@/lib/moderators";

export type AdminOverview = {
  total: number;
  scholars: number;
  alumni: number;
  admins: number;
  active: number;
  inactive: number;
  onboarded: number;
  new_7d: number;
  new_30d: number;
};

export type Breakdown = { label: string; count: number };

export type AdminDemographics = {
  by_country: Breakdown[];
  by_nationality: Breakdown[];
  by_gender: Breakdown[];
  by_role: Breakdown[];
  by_degree: Breakdown[];
};

export type TrendPoint = { date: string; count: number };

export type AdminEngagement = {
  stories: number;
  research: number;
  projects: number;
  showcase: number;
  events: number;
  offers: number;
  follows: number;
  group_members: number;
  messages: number;
  mentorships: number;
  rsvps: number;
  volunteer_hours: number;
  signups_trend: TrendPoint[];
};

export type AdminMember = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  country: string | null;
  is_active: boolean;
  created_at: string;
  completion: number;
};

export type PendingCounts = {
  stories: number;
  research_posts: number;
  alumni_offers: number;
  community_projects: number;
  showcase_items: number;
  events: number;
  total: number;
};

export type PendingItem = {
  id: string;
  title: string;
  author_name: string;
  created_at: string;
  summary: string;
};

/** Content types that flow through admin review. */
export const REVIEW_ENTITIES = [
  "stories", "research_posts", "community_projects", "alumni_offers", "showcase_items", "events",
] as const;
export type ReviewEntity = (typeof REVIEW_ENTITIES)[number];

export type Announcement = {
  id: string;
  title: string;
  body: string;
  audience: "all" | "scholars" | "alumni";
  is_active: boolean;
  created_at: string;
};

export async function getAdminOverview(): Promise<AdminOverview | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_overview");
  if (error) { console.error("admin_overview:", error.message); return null; }
  return data as AdminOverview;
}

export async function getAdminDemographics(): Promise<AdminDemographics | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_demographics");
  if (error) { console.error("admin_demographics:", error.message); return null; }
  return data as AdminDemographics;
}

export async function getAdminEngagement(): Promise<AdminEngagement | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_engagement");
  if (error) { console.error("admin_engagement:", error.message); return null; }
  return data as AdminEngagement;
}

export async function getAdminMembers(search?: string, role?: string): Promise<AdminMember[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_members", {
    p_search: search?.trim() || null,
    p_role: role || null,
  });
  if (error) { console.error("admin_members:", error.message); return []; }
  return (data as AdminMember[]) ?? [];
}

export async function getPendingCounts(): Promise<PendingCounts | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_pending_counts");
  if (error) { console.error("admin_pending_counts:", error.message); return null; }
  return data as PendingCounts;
}

export async function getPendingItems(entity: string): Promise<PendingItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_pending_items", { p_entity: entity });
  if (error) { console.error("admin_pending_items:", error.message); return []; }
  return (data as PendingItem[]) ?? [];
}

/** The capabilities the CURRENT user holds. Admins get all four; moderators get
 *  their granted set; everyone else gets an empty list. Drives which moderation
 *  controls and tabs the app reveals (the DB enforces the real authorization). */
export const getMyCapabilities = cache(async (): Promise<ModeratorCapability[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_capabilities");
  if (error) { console.error("my_capabilities:", error.message); return []; }
  return ((data as ModeratorCapability[]) ?? []);
});

/** Every moderator with their granted capabilities (admin only — RPC-enforced). */
export async function getModerators(): Promise<Moderator[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_list_moderators");
  if (error) { console.error("admin_list_moderators:", error.message); return []; }
  return (data as Moderator[]) ?? [];
}

export async function getAnnouncements(): Promise<Announcement[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("admin_announcements")
    .select("id, title, body, audience, is_active, created_at")
    .order("created_at", { ascending: false });
  if (error) { console.error("getAnnouncements:", error.message); return []; }
  return (data as Announcement[]) ?? [];
}

/** Active announcements targeted to the current user (RLS-filtered) — for the banner. */
export async function getMyAnnouncements(): Promise<Announcement[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("admin_announcements")
    .select("id, title, body, audience, is_active, created_at")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) { console.error("getMyAnnouncements:", error.message); return []; }
  return (data as Announcement[]) ?? [];
}
