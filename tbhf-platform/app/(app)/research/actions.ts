"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listResearch } from "@/lib/research";
import { RESEARCH_KINDS } from "@/lib/researchKinds";

export type ResearchSuggestion = { id: string; title: string; kind: string; field: string | null };

/** Live typeahead suggestions for the research search box. */
export async function searchResearch(q: string): Promise<ResearchSuggestion[]> {
  const term = q.trim();
  if (!term) return [];
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const posts = await listResearch({ userId: user.id, search: term });
  return posts.slice(0, 6).map((p) => ({ id: p.id, title: p.title, kind: p.kind, field: p.field }));
}

export type ResearchFormState = { error?: string } | null;

function parse(formData: FormData) {
  return {
    title: String(formData.get("title") ?? "").trim(),
    kind: String(formData.get("kind") ?? "").trim(),
    field: String(formData.get("field") ?? "").trim() || null,
    summary: String(formData.get("summary") ?? "").trim(),
    link_url: String(formData.get("link_url") ?? "").trim() || null,
    file_url: String(formData.get("file_url") ?? "").trim() || null,
    seeking_collaborators: formData.get("seeking_collaborators") === "on",
  };
}

function validate(p: ReturnType<typeof parse>): string | null {
  if (!p.title) return "A title is required.";
  if (!RESEARCH_KINDS.includes(p.kind as (typeof RESEARCH_KINDS)[number])) return "Please choose a category.";
  if (!p.summary) return "A summary / description is required.";
  return null;
}

export async function createResearch(_prev: ResearchFormState, formData: FormData): Promise<ResearchFormState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const p = parse(formData);
  const err = validate(p);
  if (err) return { error: err };

  const { data, error } = await supabase
    .from("research_posts")
    .insert({ ...p, author_id: user.id })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/research");
  redirect(`/research/${data.id}`);
}

export async function updateResearch(id: string, _prev: ResearchFormState, formData: FormData): Promise<ResearchFormState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const p = parse(formData);
  const err = validate(p);
  if (err) return { error: err };

  const { error } = await supabase
    .from("research_posts")
    .update({ ...p, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/research");
  revalidatePath(`/research/${id}`);
  redirect(`/research/${id}`);
}

export async function deleteResearch(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("research_posts").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/research");
  redirect("/research");
}

/** Toggle the current user's "I'd like to collaborate" interest. */
export async function toggleCollaborate(postId: string, interested: boolean): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  if (interested) {
    const { error } = await supabase.from("research_collaborators").delete().eq("post_id", postId).eq("profile_id", user.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("research_collaborators").upsert(
      { post_id: postId, profile_id: user.id },
      { onConflict: "post_id,profile_id" },
    );
    if (error) return { error: error.message };
  }
  revalidatePath(`/research/${postId}`);
  revalidatePath("/research");
  return {};
}
