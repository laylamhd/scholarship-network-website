import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";

export type ShowcaseItem = {
  id: string;
  title: string;
  description: string | null;
  media_type: string;
  media_url: string | null;
  thumbnail_url: string | null;
  external_url: string | null;
  created_at: string;
  review_status: string; // 'pending' | 'approved' | 'rejected'
  uploaded_by: string;
  uploader_name: string;
  uploader_avatar: string | null;
  uploader_role: UserRole;
};

type UploaderRow = { full_name: string; avatar_url: string | null; role: UserRole };

function mapItem(r: Record<string, unknown>): ShowcaseItem {
  const u = r.profiles as unknown as UploaderRow | null;
  return {
    id: r.id as string,
    title: r.title as string,
    description: (r.description as string) ?? null,
    media_type: r.media_type as string,
    media_url: (r.media_url as string) ?? null,
    thumbnail_url: (r.thumbnail_url as string) ?? null,
    external_url: (r.external_url as string) ?? null,
    created_at: r.created_at as string,
    review_status: (r.review_status as string) ?? "approved",
    uploaded_by: r.uploaded_by as string,
    uploader_name: u?.full_name ?? "TBHF",
    uploader_avatar: u?.avatar_url ?? null,
    uploader_role: (u?.role as UserRole) ?? "admin",
  };
}

const SELECT =
  "id, title, description, media_type, media_url, thumbnail_url, external_url, created_at, review_status, uploaded_by, profiles!showcase_items_uploaded_by_fkey(full_name, avatar_url, role)";

export async function listShowcase(opts: { type?: string; search?: string } = {}): Promise<ShowcaseItem[]> {
  const supabase = await createClient();
  let query = supabase.from("showcase_items").select(SELECT).order("created_at", { ascending: false }).limit(120);

  if (opts.type) query = query.eq("media_type", opts.type);
  const term = opts.search?.trim();
  if (term) query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%`);

  const { data, error } = await query;
  if (error) {
    console.error("listShowcase:", error.message);
    return [];
  }
  return (data ?? []).map((r) => mapItem(r as Record<string, unknown>));
}

/** media_type -> count, for the filter chips. */
export async function getShowcaseTypeCounts(): Promise<Map<string, number>> {
  const supabase = await createClient();
  const { data } = await supabase.from("showcase_items").select("media_type");
  const counts = new Map<string, number>();
  (data ?? []).forEach((r) => counts.set(r.media_type as string, (counts.get(r.media_type as string) ?? 0) + 1));
  return counts;
}

export async function getShowcaseItem(id: string): Promise<ShowcaseItem | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("showcase_items").select(SELECT).eq("id", id).maybeSingle();
  if (error) console.error("getShowcaseItem:", error.message);
  if (!data) return null;
  return mapItem(data as Record<string, unknown>);
}
