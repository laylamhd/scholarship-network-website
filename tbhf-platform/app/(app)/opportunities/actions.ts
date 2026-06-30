"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function toggleOppBookmark(
  opportunityId: string,
  bookmarked: boolean,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  if (bookmarked) {
    const { error } = await supabase
      .from("opportunity_bookmarks")
      .delete()
      .eq("opportunity_id", opportunityId)
      .eq("profile_id", user.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("opportunity_bookmarks")
      .upsert({ opportunity_id: opportunityId, profile_id: user.id }, { onConflict: "profile_id,opportunity_id" });
    if (error) return { error: error.message };
  }
  revalidatePath("/opportunities");
  return {};
}

export async function setApplied(
  opportunityId: string,
  applied: boolean,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  if (applied) {
    // remove the application record
    const { error } = await supabase
      .from("opportunity_applications")
      .delete()
      .eq("opportunity_id", opportunityId)
      .eq("profile_id", user.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("opportunity_applications")
      .upsert(
        { opportunity_id: opportunityId, profile_id: user.id, status: "submitted" },
        { onConflict: "opportunity_id,profile_id" },
      );
    if (error) return { error: error.message };
  }
  revalidatePath("/opportunities");
  return {};
}

export type CreateOppState = { error?: string } | null;

export async function createOpportunity(
  _prev: CreateOppState,
  formData: FormData,
): Promise<CreateOppState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const title = String(formData.get("title") ?? "").trim();
  const company_name = String(formData.get("company_name") ?? "").trim();
  const opportunity_type = String(formData.get("opportunity_type") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const application_link = String(formData.get("application_link") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim() || null;
  const is_remote = formData.get("is_remote") === "on";
  const deadline = String(formData.get("deadline") ?? "").trim() || null;

  if (!title) return { error: "Title is required." };
  if (!company_name) return { error: "Organisation name is required." };
  if (!opportunity_type) return { error: "Please choose a type." };
  if (!description) return { error: "Description is required." };
  if (!application_link) return { error: "An application link is required." };

  const { error } = await supabase.from("opportunities").insert({
    title,
    company_name,
    opportunity_type,
    description,
    application_link,
    location,
    is_remote,
    deadline,
    posted_by: user.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/opportunities");
  redirect("/opportunities");
}
