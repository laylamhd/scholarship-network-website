// Mirrors the user's Supabase schema (public.profiles + related tables).

export type UserRole = "scholar" | "alumni" | "admin";
// visibility_level enum — we only ever set "public" / "private" from the UI.
export type VisibilityLevel = "public" | "private" | "connections";

// Direct columns on public.profiles.
export interface Profile {
  id: string; // = auth.users.id
  role: UserRole;
  full_name: string;
  email: string;
  avatar_url: string | null;
  phone: string | null;
  nationality: string | null;
  date_of_birth: string | null; // ISO date
  gender: string | null;
  bio: string | null;
  country: string | null;
  city: string | null;
  career_aspirations: string | null;
  profile_visibility: VisibilityLevel;
  is_active: boolean;
  onboarded_at: string | null;
  created_at: string;
  updated_at: string;
}

// Read-only related data shown on the profile page (normalized tables).
export interface AcademicRecord {
  id: string;
  institution_name: string;
  degree_level: string;
  field_of_study: string;
  country_of_study: string;
  start_year: number;
  end_year: number | null;
  is_current: boolean;
  gpa: number | null;
}

export interface SkillTag {
  name: string;
  proficiency: number | null; // 1-5
}

export interface LanguageTag {
  name: string;
  proficiency: string | null; // basic | conversational | fluent | native
}

export interface ProfileWithRelations extends Profile {
  skills: SkillTag[];
  languages: LanguageTag[];
  interests: string[];
  academic_records: AcademicRecord[];
}

// Fields the owner can edit directly from the profile page.
// Skills / languages / interests / academic records are normalized
// (many-to-many) and get their own editors in a later step.
export type EditableProfile = Pick<
  Profile,
  | "full_name"
  | "bio"
  | "nationality"
  | "date_of_birth"
  | "gender"
  | "phone"
  | "country"
  | "city"
  | "career_aspirations"
  | "profile_visibility"
>;
