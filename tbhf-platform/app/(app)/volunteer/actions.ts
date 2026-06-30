"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listProjects } from "@/lib/volunteer";
import { VOLUNTEER_CAUSES, PROJECT_STATUSES } from "@/lib/volunteerCauses";

export type ProjectSuggestion = { id: string; title: string; cause: string; location: string | null };

/** Live typeahead suggestions for the volunteer search box. */
export async function searchProjects(q: string): Promise<ProjectSuggestion[]> {
  const term = q.trim();
  if (!term) return [];
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const projects = await listProjects({ userId: user.id, search: term });
  return projects.slice(0, 6).map((p) => ({ id: p.id, title: p.title, cause: p.cause, location: p.location }));
}

export type ProjectFormState = { error?: string } | null;

function parse(formData: FormData) {
  return {
    title: String(formData.get("title") ?? "").trim(),
    cause: String(formData.get("cause") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    location: String(formData.get("location") ?? "").trim() || null,
    image_url: String(formData.get("image_url") ?? "").trim() || null,
    start_date: String(formData.get("start_date") ?? "").trim() || null,
    end_date: String(formData.get("end_date") ?? "").trim() || null,
    status: String(formData.get("status") ?? "recruiting").trim(),
  };
}

function validate(p: ReturnType<typeof parse>): string | null {
  if (!p.title) return "A title is required.";
  if (!VOLUNTEER_CAUSES.includes(p.cause as (typeof VOLUNTEER_CAUSES)[number])) return "Please choose a cause.";
  if (!p.description) return "A description is required.";
  if (!PROJECT_STATUSES.includes(p.status as (typeof PROJECT_STATUSES)[number])) return "Invalid status.";
  return null;
}

export async function createProject(_prev: ProjectFormState, formData: FormData): Promise<ProjectFormState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const p = parse(formData);
  const err = validate(p);
  if (err) return { error: err };

  const { data, error } = await supabase
    .from("community_projects")
    .insert({ ...p, organizer_id: user.id })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/volunteer");
  revalidatePath("/events");
  redirect(`/volunteer/${data.id}`);
}

export async function updateProject(id: string, _prev: ProjectFormState, formData: FormData): Promise<ProjectFormState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const p = parse(formData);
  const err = validate(p);
  if (err) return { error: err };

  const { error } = await supabase
    .from("community_projects")
    .update({ ...p, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/volunteer");
  revalidatePath("/events");
  revalidatePath(`/volunteer/${id}`);
  redirect(`/volunteer/${id}`);
}

export async function deleteProject(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("community_projects").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/volunteer");
  revalidatePath("/events");
  redirect("/events?tab=volunteering");
}

/** Toggle the current user's sign-up to volunteer for a project. */
export async function toggleVolunteer(projectId: string, joined: boolean): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  if (joined) {
    const { error } = await supabase.from("project_volunteers").delete().eq("project_id", projectId).eq("profile_id", user.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("project_volunteers").upsert(
      { project_id: projectId, profile_id: user.id },
      { onConflict: "project_id,profile_id" },
    );
    if (error) return { error: error.message };
  }
  revalidatePath(`/volunteer/${projectId}`);
  revalidatePath("/volunteer");
  revalidatePath("/events");
  return {};
}

/** Organizer shares the outcome and/or updates project status. */
export async function saveOutcome(projectId: string, outcome: string, status: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const okStatus = PROJECT_STATUSES.includes(status as (typeof PROJECT_STATUSES)[number]) ? status : "completed";
  const { error } = await supabase
    .from("community_projects")
    .update({ outcome: outcome.trim() || null, status: okStatus, updated_at: new Date().toISOString() })
    .eq("id", projectId);
  if (error) return { error: error.message };
  revalidatePath(`/volunteer/${projectId}`);
  revalidatePath("/volunteer");
  revalidatePath("/events");
  return {};
}

/** Record volunteer hours (optionally tied to a project). */
export async function logHours(input: {
  hours: number;
  activity: string;
  date: string;
  projectId: string | null;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  if (!(input.hours > 0)) return { error: "Enter a number of hours." };
  const { error } = await supabase.from("volunteer_hours").insert({
    profile_id: user.id,
    project_id: input.projectId,
    hours: input.hours,
    activity: input.activity.trim() || null,
    logged_date: input.date || new Date().toISOString().slice(0, 10),
  });
  if (error) return { error: error.message };
  revalidatePath("/volunteer");
  revalidatePath("/events");
  if (input.projectId) revalidatePath(`/volunteer/${input.projectId}`);
  return {};
}

export async function deleteHours(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("volunteer_hours").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/volunteer");
  revalidatePath("/events");
  return {};
}
