import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";

export type ResearchCard = {
  id: string;
  title: string;
  kind: string;
  field: string | null;
  summary: string;
  link_url: string | null;
  file_url: string | null;
  seeking_collaborators: boolean;
  created_at: string;
  author_id: string;
  author_name: string;
  author_avatar: string | null;
  author_role: UserRole;
  collab_count: number;
  i_collaborate: boolean;
};

export type Collaborator = {
  profile_id: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
};

type AuthorRow = { id: string; full_name: string; avatar_url: string | null; role: UserRole };

function mapAuthor(a: AuthorRow | null) {
  return {
    author_name: a?.full_name ?? "Unknown",
    author_avatar: a?.avatar_url ?? null,
    author_role: (a?.role as UserRole) ?? "scholar",
  };
}

async function collabInfo(postIds: string[], userId: string) {
  const supabase = await createClient();
  if (postIds.length === 0) return { counts: new Map<string, number>(), mine: new Set<string>() };
  const [{ data: all }, { data: mineRows }] = await Promise.all([
    supabase.from("research_collaborators").select("post_id").in("post_id", postIds),
    supabase.from("research_collaborators").select("post_id").eq("profile_id", userId).in("post_id", postIds),
  ]);
  const counts = new Map<string, number>();
  (all ?? []).forEach((r) => counts.set(r.post_id as string, (counts.get(r.post_id as string) ?? 0) + 1));
  const mine = new Set((mineRows ?? []).map((r) => r.post_id as string));
  return { counts, mine };
}

const SELECT =
  "id, title, kind, field, summary, link_url, file_url, seeking_collaborators, created_at, author_id, profiles!research_posts_author_id_fkey(id, full_name, avatar_url, role)";

export async function listResearch(opts: {
  userId: string;
  kind?: string;
  search?: string;
  mineOnly?: boolean;
  seekingOnly?: boolean;
}): Promise<ResearchCard[]> {
  const supabase = await createClient();
  let query = supabase.from("research_posts").select(SELECT).order("created_at", { ascending: false }).limit(120);

  if (opts.mineOnly) query = query.eq("author_id", opts.userId);
  if (opts.kind) query = query.eq("kind", opts.kind);
  if (opts.seekingOnly) query = query.eq("seeking_collaborators", true);
  const term = opts.search?.trim();
  if (term) query = query.or(`title.ilike.%${term}%,summary.ilike.%${term}%,field.ilike.%${term}%`);

  const { data, error } = await query;
  if (error) {
    console.error("listResearch:", error.message);
    return [];
  }
  const rows = data ?? [];
  const { counts, mine } = await collabInfo(rows.map((r) => r.id as string), opts.userId);
  return rows.map((r) => ({
    id: r.id as string,
    title: r.title as string,
    kind: r.kind as string,
    field: (r.field as string) ?? null,
    summary: r.summary as string,
    link_url: (r.link_url as string) ?? null,
    file_url: (r.file_url as string) ?? null,
    seeking_collaborators: Boolean(r.seeking_collaborators),
    created_at: r.created_at as string,
    author_id: r.author_id as string,
    ...mapAuthor(r.profiles as unknown as AuthorRow | null),
    collab_count: counts.get(r.id as string) ?? 0,
    i_collaborate: mine.has(r.id as string),
  }));
}

export async function getResearchKindCounts(): Promise<Map<string, number>> {
  const supabase = await createClient();
  const { data } = await supabase.from("research_posts").select("kind");
  const counts = new Map<string, number>();
  (data ?? []).forEach((r) => counts.set(r.kind as string, (counts.get(r.kind as string) ?? 0) + 1));
  return counts;
}

export async function getResearch(id: string, userId: string): Promise<ResearchCard | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("research_posts").select(SELECT).eq("id", id).maybeSingle();
  if (error) console.error("getResearch:", error.message);
  if (!data) return null;
  const { counts, mine } = await collabInfo([data.id as string], userId);
  return {
    id: data.id as string,
    title: data.title as string,
    kind: data.kind as string,
    field: (data.field as string) ?? null,
    summary: data.summary as string,
    link_url: (data.link_url as string) ?? null,
    file_url: (data.file_url as string) ?? null,
    seeking_collaborators: Boolean(data.seeking_collaborators),
    created_at: data.created_at as string,
    author_id: data.author_id as string,
    ...mapAuthor(data.profiles as unknown as AuthorRow | null),
    collab_count: counts.get(data.id as string) ?? 0,
    i_collaborate: mine.has(data.id as string),
  };
}

/** The members who expressed interest in collaborating on a post. */
export async function getCollaborators(postId: string): Promise<Collaborator[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("research_collaborators")
    .select("created_at, profiles!research_collaborators_profile_id_fkey(id, full_name, avatar_url, role)")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("getCollaborators:", error.message);
    return [];
  }
  return (data ?? []).map((r) => {
    const p = r.profiles as unknown as AuthorRow | null;
    return {
      profile_id: p?.id ?? "",
      full_name: p?.full_name ?? "Unknown",
      avatar_url: p?.avatar_url ?? null,
      role: (p?.role as UserRole) ?? "scholar",
      created_at: r.created_at as string,
    };
  });
}
