import { createClient } from "@/lib/supabase/server";
import type {
  AcademicRecord,
  AlumniDetails,
  Certification,
  EmploymentEntry,
  FullProfile,
  Profile,
  VolunteerEntry,
} from "@/lib/types";

/** The signed-in auth user, or null. */
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Allowed values for a Postgres enum (used to build dropdowns). */
export async function getEnumValues(enumType: string): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_enum_values", {
    enum_type: enumType,
  });
  if (error) {
    console.error(`getEnumValues(${enumType}):`, error.message);
    return [];
  }
  return (data as string[]) ?? [];
}

/** Fetch a full profile (core + academic + tags + alumni + work). RLS gates visibility. */
export async function getFullProfile(id: string): Promise<FullProfile | null> {
  const supabase = await createClient();

  // SECURITY (BUG-010): never read the `email` column here. Member email is not
  // shown on profile pages (the owner's own email comes from the auth session in
  // Settings), and the DB revokes column SELECT on profiles.email from clients so
  // it can't be scraped via REST. Select every profile column EXCEPT email — keep
  // this list in sync with the grant in supabase/security_hardening.sql.
  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, avatar_url, role, country, nationality, gender, bio, profile_visibility, is_active, created_at, updated_at, onboarded_at, date_of_birth, phone, city, dashboard_layout, notification_prefs, field_privacy, research_interests, career_aspirations, volunteer_experience",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) console.error("getFullProfile profile:", error.message);
  if (!profile) return null;

  const [
    academicRes,
    skillsRes,
    langsRes,
    interestsRes,
    alumniRes,
    employmentRes,
    certsRes,
    volunteerRes,
  ] = await Promise.all([
    supabase
      .from("scholar_academic_records")
      .select("*")
      .eq("profile_id", id)
      .order("start_year", { ascending: false }),
    supabase.from("profile_skills").select("skills(name)").eq("profile_id", id),
    supabase
      .from("profile_languages")
      .select("languages(name)")
      .eq("profile_id", id),
    supabase
      .from("profile_interests")
      .select("interests(name)")
      .eq("profile_id", id),
    supabase
      .from("alumni_details")
      .select("*")
      .eq("profile_id", id)
      .maybeSingle(),
    supabase
      .from("employment_history")
      .select("*")
      .eq("profile_id", id)
      .order("start_date", { ascending: false }),
    supabase
      .from("certifications")
      .select("*")
      .eq("profile_id", id)
      .order("issue_date", { ascending: false }),
    supabase
      .from("volunteer_experiences")
      .select("*")
      .eq("profile_id", id)
      .order("start_date", { ascending: false }),
  ]);

  // Supabase types the embedded relation loosely; normalize to a name list.
  const pluck = (
    res: { data: unknown },
    key: "skills" | "languages" | "interests",
  ): string[] => {
    const rows = (res.data as Array<Record<string, { name: string } | null>>) ?? [];
    return rows.map((r) => r[key]?.name).filter((n): n is string => Boolean(n));
  };

  return {
    profile: profile as Profile,
    academic: (academicRes.data as AcademicRecord[]) ?? [],
    skills: pluck(skillsRes, "skills"),
    languages: pluck(langsRes, "languages"),
    interests: pluck(interestsRes, "interests"),
    alumni: (alumniRes.data as AlumniDetails | null) ?? null,
    employment: (employmentRes.data as EmploymentEntry[]) ?? [],
    certifications: (certsRes.data as Certification[]) ?? [],
    volunteer: (volunteerRes.data as VolunteerEntry[]) ?? [],
  };
}

/** The signed-in user's own full profile. */
export async function getMyFullProfile(): Promise<FullProfile | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return getFullProfile(user.id);
}

/** Whether a given profile has been granted moderator status (badge only). */
export async function isProfileModerator(id: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("is_profile_moderator", { p_id: id });
  return data === true;
}

/** The signed-in user's role (lightweight). */
export async function getMyRole(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return (data?.role as string) ?? null;
}

export type DashboardStats = {
  followers: number;
  following: number;
  educationCount: number;
};

/** Lightweight counts for the dashboard. */
export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const supabase = await createClient();
  const [followers, following, education] = await Promise.all([
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", userId)
      .eq("status", "active"),
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", userId)
      .eq("status", "active"),
    supabase
      .from("scholar_academic_records")
      .select("*", { count: "exact", head: true })
      .eq("profile_id", userId),
  ]);
  return {
    followers: followers.count ?? 0,
    following: following.count ?? 0,
    educationCount: education.count ?? 0,
  };
}

/** Rough profile-completion percentage for the dashboard nudge. */
export function profileCompletion(data: FullProfile): number {
  const p = data.profile;
  const checks = [
    Boolean(p.avatar_url),
    Boolean(p.bio),
    Boolean(p.nationality),
    Boolean(p.country),
    Boolean(p.career_aspirations),
    data.skills.length > 0,
    data.languages.length > 0,
    data.academic.length > 0,
  ];
  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
}
