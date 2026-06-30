"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SHOWCASE_TYPES } from "@/lib/showcaseTypes";

export type ShowcaseFormState = { error?: string } | null;

export async function createShowcaseItem(_prev: ShowcaseFormState, formData: FormData): Promise<ShowcaseFormState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const title = String(formData.get("title") ?? "").trim();
  const media_type = String(formData.get("media_type") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const media_url = String(formData.get("media_url") ?? "").trim() || null;
  const thumbnail_url = String(formData.get("thumbnail_url") ?? "").trim() || null;
  const external_url = String(formData.get("external_url") ?? "").trim() || null;

  if (!title) return { error: "A title is required." };
  if (!SHOWCASE_TYPES.includes(media_type as (typeof SHOWCASE_TYPES)[number])) return { error: "Please choose a media type." };
  if (!media_url && !external_url) return { error: "Upload a file or provide an external link." };

  const { data, error } = await supabase
    .from("showcase_items")
    .insert({ title, media_type, description, media_url, thumbnail_url, external_url, uploaded_by: user.id })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/showcase");
  redirect(`/showcase/${data.id}`);
}

export async function deleteShowcaseItem(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("showcase_items").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/showcase");
  redirect("/showcase");
}
