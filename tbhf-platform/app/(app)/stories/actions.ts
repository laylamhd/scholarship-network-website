"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { STORY_CATEGORIES } from "@/lib/storyCategories";

export type StoryFormState = { error?: string } | null;

function parseStory(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const excerpt = String(formData.get("excerpt") ?? "").trim() || null;
  const body = String(formData.get("body") ?? "").trim();
  const cover_image_url = String(formData.get("cover_image_url") ?? "").trim() || null;
  const status = formData.get("publish") === "draft" ? "draft" : "published";
  const featured_consent = formData.get("featured_consent") === "on";
  return { title, category, excerpt, body, cover_image_url, status, featured_consent };
}

function validate(s: ReturnType<typeof parseStory>): string | null {
  if (!s.title) return "A title is required.";
  if (!STORY_CATEGORIES.includes(s.category as (typeof STORY_CATEGORIES)[number])) return "Please choose a category.";
  if (!s.body) return "Your story needs some content.";
  return null;
}

/** Estimated reading time in minutes (~200 words/min). */
function readMinutes(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export async function createStory(_prev: StoryFormState, formData: FormData): Promise<StoryFormState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const s = parseStory(formData);
  const err = validate(s);
  if (err) return { error: err };

  const { data, error } = await supabase
    .from("stories")
    .insert({
      author_id: user.id,
      title: s.title,
      category: s.category,
      excerpt: s.excerpt,
      body: s.body,
      cover_image_url: s.cover_image_url,
      status: s.status,
      featured_consent: s.featured_consent,
      read_minutes: readMinutes(s.body),
      published_at: s.status === "published" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/stories");
  redirect(`/stories/${data.id}`);
}

export async function updateStory(id: string, _prev: StoryFormState, formData: FormData): Promise<StoryFormState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const s = parseStory(formData);
  const err = validate(s);
  if (err) return { error: err };

  const { error } = await supabase
    .from("stories")
    .update({
      title: s.title,
      category: s.category,
      excerpt: s.excerpt,
      body: s.body,
      cover_image_url: s.cover_image_url,
      status: s.status,
      featured_consent: s.featured_consent,
      read_minutes: readMinutes(s.body),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/stories");
  revalidatePath(`/stories/${id}`);
  redirect(`/stories/${id}`);
}

export async function deleteStory(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("stories").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/stories");
  redirect("/stories");
}

export async function toggleStoryLike(id: string, liked: boolean): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  if (liked) {
    const { error } = await supabase.from("story_likes").delete().eq("story_id", id).eq("profile_id", user.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("story_likes").upsert(
      { story_id: id, profile_id: user.id },
      { onConflict: "story_id,profile_id" },
    );
    if (error) return { error: error.message };
  }
  revalidatePath(`/stories/${id}`);
  revalidatePath("/stories");
  return {};
}

/** Admin: feature / unfeature a story (RPC enforces author consent). */
export async function setStoryFeatured(id: string, featured: boolean): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_story_featured", { p_id: id, p_featured: featured });
  if (error) return { error: error.message.replace(/^.*?:\s*/, "") };
  revalidatePath(`/stories/${id}`);
  revalidatePath("/stories");
  return {};
}
