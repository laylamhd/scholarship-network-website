"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getPendingItems, getAdminMembers, type PendingItem, type AdminMember } from "@/lib/admin";

const ROLES = ["scholar", "alumni", "admin"];
const AUDIENCES = ["all", "scholars", "alumni"];
const REVIEW_ENTITIES = ["stories", "research_posts", "community_projects", "alumni_offers", "showcase_items", "events"];
const MOD_CAPS = ["moderate_content", "manage_announcements", "manage_events_resources", "manage_communities"];

/** Fetch the pending items for one content type (admin moderation modal). */
export async function loadPendingItems(entity: string): Promise<PendingItem[]> {
  if (!REVIEW_ENTITIES.includes(entity)) return [];
  return getPendingItems(entity);
}

/** Approve or reject a piece of pending content (admin only — enforced by the RPC). */
export async function reviewContent(entity: string, id: string, decision: "approved" | "rejected", reason?: string): Promise<{ error?: string }> {
  if (!REVIEW_ENTITIES.includes(entity)) return { error: "Unknown content type." };
  if (decision !== "approved" && decision !== "rejected") return { error: "Invalid decision." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_review_content", {
    p_entity: entity, p_id: id, p_decision: decision, p_reason: reason?.trim() || null,
  });
  if (error) return { error: error.message };
  revalidatePath("/");
  return {};
}

/** Live typeahead for the Advanced-settings member pickers: search every member
 *  by name or email (admin only — enforced by the underlying RPC). */
export async function searchMembers(query: string): Promise<AdminMember[]> {
  const term = query.trim();
  if (!term) return [];
  return getAdminMembers(term);
}

/** Change a member's role (admin only — enforced by the RPC). */
export async function setMemberRole(targetId: string, role: string): Promise<{ error?: string }> {
  if (!ROLES.includes(role)) return { error: "Invalid role." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_role", { p_target: targetId, p_role: role });
  if (error) return { error: error.message };
  revalidatePath("/");
  return {};
}

/** Activate / deactivate a member account. */
export async function setMemberActive(targetId: string, active: boolean): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_active", { p_target: targetId, p_active: active });
  if (error) return { error: error.message };
  revalidatePath("/");
  return {};
}

/** Grant or update a moderator's capabilities (admin only — enforced by the RPC).
 *  Passing an empty list revokes the grant. */
export async function setModerator(targetId: string, caps: string[]): Promise<{ error?: string }> {
  const clean = caps.filter((c) => MOD_CAPS.includes(c));
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_moderator", { p_target: targetId, p_caps: clean });
  if (error) return { error: error.message };
  revalidatePath("/");
  return {};
}

/** Remove a moderator grant entirely (admin only — enforced by the RPC). */
export async function revokeModerator(targetId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_revoke_moderator", { p_target: targetId });
  if (error) return { error: error.message };
  revalidatePath("/");
  return {};
}

export type AnnouncementState = { error?: string } | null;

function parseAnnouncement(formData: FormData) {
  return {
    title: String(formData.get("title") ?? "").trim(),
    body: String(formData.get("body") ?? "").trim(),
    audience: String(formData.get("audience") ?? "all").trim(),
    is_active: String(formData.get("is_active") ?? "true") === "true",
  };
}

function validate(p: ReturnType<typeof parseAnnouncement>): string | null {
  if (!p.title) return "A title is required.";
  if (!p.body) return "A message is required.";
  if (!AUDIENCES.includes(p.audience)) return "Invalid audience.";
  return null;
}

export async function createAnnouncement(_prev: AnnouncementState, formData: FormData): Promise<AnnouncementState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const p = parseAnnouncement(formData);
  const err = validate(p);
  if (err) return { error: err };

  const { error } = await supabase.from("admin_announcements").insert({ ...p, created_by: user.id });
  if (error) return { error: error.message };
  revalidatePath("/");
  return null;
}

export async function updateAnnouncement(id: string, _prev: AnnouncementState, formData: FormData): Promise<AnnouncementState> {
  const supabase = await createClient();
  const p = parseAnnouncement(formData);
  const err = validate(p);
  if (err) return { error: err };

  const { error } = await supabase
    .from("admin_announcements")
    .update({ ...p, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/");
  return null;
}

export async function toggleAnnouncement(id: string, active: boolean): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("admin_announcements")
    .update({ is_active: !active, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/");
  return {};
}

export async function deleteAnnouncement(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("admin_announcements").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/");
  return {};
}
