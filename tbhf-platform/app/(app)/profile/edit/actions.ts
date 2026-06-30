"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type SaveState = { error?: string; ok?: boolean } | null;

// Fields the scholar can individually choose to show/hide on their public profile.
const PRIVACY_KEYS = [
  "location",
  "nationality",
  "phone",
  "bio",
  "skills",
  "languages",
  "interests",
  "career_aspirations",
  "research_interests",
  "volunteer_experience",
  "education",
  "professional",
] as const;

function text(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) ?? "").trim();
  return v === "" ? null : v;
}

function list(fd: FormData, key: string): string[] {
  return String(fd.get(key) ?? "")
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function json(fd: FormData, key: string): unknown {
  try {
    return JSON.parse(String(fd.get(key) ?? "[]"));
  } catch {
    return [];
  }
}

export async function updateProfile(
  _prev: SaveState,
  formData: FormData,
): Promise<SaveState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You are not signed in." };

  const fullName = text(formData, "full_name");
  if (!fullName) return { error: "Full name is required." };

  const roleRaw = String(formData.get("role") ?? "scholar");
  const role = roleRaw === "alumni" ? "alumni" : roleRaw === "admin" ? "admin" : "scholar";

  // Per-field privacy: a key is hidden (false) when its "show publicly" box is unchecked.
  const field_privacy: Record<string, boolean> = {};
  for (const key of PRIVACY_KEYS) {
    if (formData.get(`priv_${key}`) !== "on") field_privacy[key] = false;
  }

  // 1) Core profile row
  const { error: profileErr } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      role,
      nationality: text(formData, "nationality"),
      date_of_birth: text(formData, "date_of_birth"),
      gender: text(formData, "gender"),
      phone: text(formData, "phone"),
      bio: text(formData, "bio"),
      country: text(formData, "country"),
      city: text(formData, "city"),
      career_aspirations: text(formData, "career_aspirations"),
      research_interests: text(formData, "research_interests"),
      volunteer_experience: text(formData, "volunteer_experience"),
      profile_visibility: text(formData, "profile_visibility") ?? "public",
      field_privacy,
      avatar_url: text(formData, "avatar_url"),
    })
    .eq("id", user.id);

  if (profileErr) return { error: profileErr.message };

  // 2) Relational writes via security-definer RPCs
  const rpcs = [
    supabase.rpc("set_my_skills", { p_names: list(formData, "skills") }),
    supabase.rpc("set_my_languages", { p_names: list(formData, "languages") }),
    supabase.rpc("set_my_interests", { p_names: list(formData, "interests") }),
    supabase.rpc("replace_my_academic_records", { p_records: json(formData, "academic_json") }),
    supabase.rpc("replace_my_volunteer_experiences", { p_rows: json(formData, "volunteer_json") }),
  ];

  // 3) Alumni-only data
  if (role === "alumni") {
    rpcs.push(
      supabase.rpc("upsert_my_alumni_details", {
        p: {
          current_employer: text(formData, "current_employer"),
          current_position: text(formData, "current_position"),
          industry: text(formData, "industry"),
          seniority_level: text(formData, "seniority_level"),
          sector: text(formData, "sector"),
          linkedin_url: text(formData, "linkedin_url"),
          willing_to_mentor: formData.get("willing_to_mentor") === "on",
        },
      }),
      supabase.rpc("replace_my_employment_history", { p_rows: json(formData, "employment_json") }),
      supabase.rpc("replace_my_certifications", { p_rows: json(formData, "certifications_json") }),
    );
  }

  const results = await Promise.all(rpcs);
  const failed = results.find((r) => r.error);
  if (failed?.error) return { error: failed.error.message };

  revalidatePath("/profile");
  revalidatePath("/");
  redirect("/profile");
}
