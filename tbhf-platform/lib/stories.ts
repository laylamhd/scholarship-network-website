import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";

export type StoryCard = {
  id: string;
  title: string;
  category: string;
  excerpt: string | null;
  cover_image_url: string | null;
  status: "draft" | "published";
  is_featured: boolean;
  read_minutes: number | null;
  published_at: string | null;
  created_at: string;
  author_id: string;
  author_name: string;
  author_avatar: string | null;
  author_role: UserRole;
  like_count: number;
  liked: boolean;
  view_count: number;
};

export type StoryDetail = StoryCard & {
  body: string;
  featured_consent: boolean;
};

type AuthorRow = { id: string; full_name: string; avatar_url: string | null; role: UserRole };

function mapAuthor(a: AuthorRow | null): Pick<StoryCard, "author_name" | "author_avatar" | "author_role"> {
  return {
    author_name: a?.full_name ?? "Unknown",
    author_avatar: a?.avatar_url ?? null,
    author_role: (a?.role as UserRole) ?? "scholar",
  };
}

/** Engagement (like counts + which the viewer liked) for a set of stories. */
async function engagement(storyIds: string[], userId: string) {
  const supabase = await createClient();
  if (storyIds.length === 0) return { counts: new Map<string, number>(), mine: new Set<string>() };
  const [{ data: likes }, { data: mineRows }] = await Promise.all([
    supabase.from("story_likes").select("story_id").in("story_id", storyIds),
    supabase.from("story_likes").select("story_id").eq("profile_id", userId).in("story_id", storyIds),
  ]);
  const counts = new Map<string, number>();
  (likes ?? []).forEach((l) => counts.set(l.story_id as string, (counts.get(l.story_id as string) ?? 0) + 1));
  const mine = new Set((mineRows ?? []).map((r) => r.story_id as string));
  return { counts, mine };
}

/** Total view counts for a set of stories. */
async function viewCounts(storyIds: string[]): Promise<Map<string, number>> {
  const supabase = await createClient();
  if (storyIds.length === 0) return new Map();
  const { data } = await supabase.from("story_views").select("story_id").in("story_id", storyIds);
  const counts = new Map<string, number>();
  (data ?? []).forEach((r) => counts.set(r.story_id as string, (counts.get(r.story_id as string) ?? 0) + 1));
  return counts;
}

const STORY_SELECT =
  "id, title, category, excerpt, cover_image_url, status, is_featured, read_minutes, published_at, created_at, author_id, profiles!stories_author_id_fkey(id, full_name, avatar_url, role)";

/* eslint-disable @typescript-eslint/no-explicit-any */
function toCard(
  r: any,
  counts: Map<string, number>,
  mine: Set<string>,
  views: Map<string, number>,
): StoryCard {
  return {
    id: r.id as string,
    title: r.title as string,
    category: r.category as string,
    excerpt: (r.excerpt as string) ?? null,
    cover_image_url: (r.cover_image_url as string) ?? null,
    status: r.status as "draft" | "published",
    is_featured: Boolean(r.is_featured),
    read_minutes: (r.read_minutes as number) ?? null,
    published_at: (r.published_at as string) ?? null,
    created_at: r.created_at as string,
    author_id: r.author_id as string,
    ...mapAuthor(r.profiles as unknown as AuthorRow | null),
    like_count: counts.get(r.id as string) ?? 0,
    liked: mine.has(r.id as string),
    view_count: views.get(r.id as string) ?? 0,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function listStories(opts: {
  userId: string;
  category?: string;
  search?: string;
  featuredOnly?: boolean;
  mineOnly?: boolean;
  authorIn?: string[];
}): Promise<StoryCard[]> {
  const supabase = await createClient();

  // Following feed with nobody followed yet -> nothing to show.
  if (opts.authorIn && opts.authorIn.length === 0) return [];

  let query = supabase
    .from("stories")
    .select(STORY_SELECT)
    .order("published_at", { ascending: false })
    .limit(100);

  // RLS hides others' drafts; for the public lists we still want published only.
  if (opts.mineOnly) query = query.eq("author_id", opts.userId);
  else query = query.eq("status", "published");

  if (opts.authorIn) query = query.in("author_id", opts.authorIn);
  if (opts.category) query = query.eq("category", opts.category);
  if (opts.featuredOnly) query = query.eq("is_featured", true);
  const term = opts.search?.trim();
  if (term) query = query.or(`title.ilike.%${term}%,excerpt.ilike.%${term}%`);

  const { data, error } = await query;
  if (error) {
    console.error("listStories:", error.message);
    return [];
  }

  const rows = data ?? [];
  const ids = rows.map((r) => r.id as string);
  const [{ counts, mine }, views] = await Promise.all([engagement(ids, opts.userId), viewCounts(ids)]);

  return rows.map((r) => toCard(r, counts, mine, views));
}

/**
 * The most-viewed published story over the last 7 days — powers the
 * "Most popular story this week" hero. Returns null when nobody has viewed
 * any story this week (so the caller can fall back to a featured/latest lead).
 */
export async function getMostPopularThisWeek(userId: string): Promise<StoryCard | null> {
  const supabase = await createClient();
  const since = new Date();
  since.setDate(since.getDate() - 6); // today + the 6 days before = a 7-day window
  const { data: vrows } = await supabase
    .from("story_views")
    .select("story_id")
    .gte("view_date", since.toISOString().slice(0, 10));

  const weekly = new Map<string, number>();
  (vrows ?? []).forEach((r) => weekly.set(r.story_id as string, (weekly.get(r.story_id as string) ?? 0) + 1));
  if (weekly.size === 0) return null;

  const { data } = await supabase
    .from("stories")
    .select(STORY_SELECT)
    .in("id", [...weekly.keys()])
    .eq("status", "published");

  const rows = data ?? [];
  if (rows.length === 0) return null;

  // Highest weekly views wins; ties broken by most recently published.
  rows.sort((a, b) => {
    const d = (weekly.get(b.id as string) ?? 0) - (weekly.get(a.id as string) ?? 0);
    if (d !== 0) return d;
    return String(b.published_at ?? "").localeCompare(String(a.published_at ?? ""));
  });
  const top = rows[0];

  const [{ counts, mine }, views] = await Promise.all([
    engagement([top.id as string], userId),
    viewCounts([top.id as string]),
  ]);
  return toCard(top, counts, mine, views);
}

/**
 * Record that a member viewed a story (deduped per viewer per day by the
 * table's primary key). Author self-views are skipped so writers can't pad
 * their own counts.
 */
export async function recordStoryView(storyId: string, viewerId: string, authorId: string): Promise<void> {
  if (viewerId === authorId) return;
  const supabase = await createClient();
  await supabase
    .from("story_views")
    .upsert(
      { story_id: storyId, viewer_id: viewerId },
      { onConflict: "story_id,viewer_id,view_date", ignoreDuplicates: true },
    );
}

/** Category -> published story count (for the browse cards). */
export async function getStoryCategoryCounts(): Promise<Map<string, number>> {
  const supabase = await createClient();
  const { data } = await supabase.from("stories").select("category").eq("status", "published");
  const counts = new Map<string, number>();
  (data ?? []).forEach((r) => counts.set(r.category as string, (counts.get(r.category as string) ?? 0) + 1));
  return counts;
}

export async function getStory(id: string, userId: string): Promise<StoryDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stories")
    .select("id, title, category, excerpt, body, cover_image_url, status, is_featured, featured_consent, read_minutes, published_at, created_at, author_id, profiles!stories_author_id_fkey(id, full_name, avatar_url, role)")
    .eq("id", id)
    .maybeSingle();

  if (error) console.error("getStory:", error.message);
  if (!data) return null;

  const [{ counts, mine }, views] = await Promise.all([
    engagement([data.id as string], userId),
    viewCounts([data.id as string]),
  ]);
  return {
    id: data.id as string,
    title: data.title as string,
    category: data.category as string,
    excerpt: (data.excerpt as string) ?? null,
    body: data.body as string,
    cover_image_url: (data.cover_image_url as string) ?? null,
    status: data.status as "draft" | "published",
    is_featured: Boolean(data.is_featured),
    featured_consent: Boolean(data.featured_consent),
    read_minutes: (data.read_minutes as number) ?? null,
    published_at: (data.published_at as string) ?? null,
    created_at: data.created_at as string,
    author_id: data.author_id as string,
    ...mapAuthor(data.profiles as unknown as AuthorRow | null),
    like_count: counts.get(data.id as string) ?? 0,
    liked: mine.has(data.id as string),
    view_count: views.get(data.id as string) ?? 0,
  };
}
