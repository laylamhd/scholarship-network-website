export type UserRole = "scholar" | "alumni" | "admin";

/** Per-field visibility map. Missing key = public. false = hidden from others. */
export type FieldPrivacy = Record<string, boolean>;

/** public.profiles */
export type Profile = {
  id: string;
  role: UserRole;
  full_name: string;
  // Not selected for profile views (BUG-010): the profiles.email column is only
  // readable by the owner (via the auth session) and admins (via admin_* RPCs).
  email?: string;
  avatar_url: string | null;
  phone: string | null;
  nationality: string | null;
  date_of_birth: string | null;
  gender: string | null;
  bio: string | null;
  country: string | null;
  city: string | null;
  career_aspirations: string | null;
  volunteer_experience: string | null;
  research_interests: string | null;
  profile_visibility: string; // visibility_level enum (values fetched at runtime)
  field_privacy: FieldPrivacy;
  is_active: boolean;
  onboarded_at: string | null;
  created_at: string;
  updated_at: string;
};

/** public.scholar_academic_records */
export type AcademicRecord = {
  id?: string;
  institution_name: string;
  degree_level: string; // degree_level enum
  field_of_study: string;
  country_of_study: string;
  year_of_study: string | null;
  start_year: number | string;
  end_year: number | string | null;
  is_current: boolean;
  gpa: number | string | null;
};

/** public.alumni_details (1:1) */
export type AlumniDetails = {
  current_employer: string | null;
  current_position: string | null;
  years_of_experience: number | null;
  industry: string | null;
  seniority_level: string | null;
  sector: string | null;
  linkedin_url: string | null;
  willing_to_mentor: boolean;
};

/** public.employment_history */
export type EmploymentEntry = {
  id?: string;
  company_name: string;
  job_title: string;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
};

/** public.certifications */
export type Certification = {
  id?: string;
  title: string;
  issuing_org: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  credential_url: string | null;
};

/** public.volunteer_experiences (CV-style, profile-level) */
export type VolunteerEntry = {
  id?: string;
  organization: string;
  role: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
};

/** Everything needed to render a profile page. */
export type FullProfile = {
  profile: Profile;
  academic: AcademicRecord[];
  skills: string[];
  languages: string[];
  interests: string[];
  alumni: AlumniDetails | null;
  employment: EmploymentEntry[];
  certifications: Certification[];
  volunteer: VolunteerEntry[];
};
