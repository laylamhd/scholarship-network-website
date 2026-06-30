"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function toggleBookmark(
  resourceId: string,
  bookmarked: boolean,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  if (bookmarked) {
    const { error } = await supabase
      .from("resource_bookmarks")
      .delete()
      .eq("resource_id", resourceId)
      .eq("profile_id", user.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("resource_bookmarks")
      .upsert({ resource_id: resourceId, profile_id: user.id }, { onConflict: "profile_id,resource_id" });
    if (error) return { error: error.message };
  }
  revalidatePath("/resources");
  return {};
}

export type CreateResourceState = { error?: string } | null;

export async function createResource(
  _prev: CreateResourceState,
  formData: FormData,
): Promise<CreateResourceState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category_id = String(formData.get("category_id") ?? "").trim() || null;
  const resource_type = String(formData.get("resource_type") ?? "").trim() || "pdf";
  const external_link = String(formData.get("external_link") ?? "").trim() || null;
  const file_url = String(formData.get("file_url") ?? "").trim() || null;

  if (!title) return { error: "Please give the resource a title." };
  if (!external_link && !file_url) return { error: "Add a link or upload a file." };

  const { error } = await supabase.from("resources").insert({
    title,
    description: description || null,
    category_id,
    resource_type,
    external_link,
    file_url,
    uploaded_by: user.id,
    is_published: true,
  });

  if (error) return { error: error.message };

  revalidatePath("/resources");
  redirect("/resources");
}
