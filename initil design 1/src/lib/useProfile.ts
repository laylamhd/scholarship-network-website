import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./AuthContext";
import type { EditableProfile, ProfileWithRelations } from "./types";

interface UseProfileResult {
  profile: ProfileWithRelations | null;
  loading: boolean;
  error: string | null;
  /** Persist a partial update for the signed-in user's own profile. */
  updateProfile: (changes: Partial<EditableProfile>) => Promise<{ error: string | null }>;
  reload: () => Promise<void>;
}

// Selects the profile row plus its normalized skills / languages / interests /
// academic records via PostgREST embedding.
const PROFILE_SELECT = `
  *,
  profile_skills ( proficiency, skills ( name ) ),
  profile_languages ( proficiency, languages ( name ) ),
  profile_interests ( interests ( name ) ),
  scholar_academic_records ( * )
`;

// PostgREST returns embedded rows nested; flatten them for the UI.
function shapeProfile(row: Record<string, any>): ProfileWithRelations {
  const { profile_skills, profile_languages, profile_interests, scholar_academic_records, ...base } =
    row;
  return {
    ...(base as ProfileWithRelations),
    skills: (profile_skills ?? [])
      .filter((r: any) => r.skills)
      .map((r: any) => ({ name: r.skills.name, proficiency: r.proficiency })),
    languages: (profile_languages ?? [])
      .filter((r: any) => r.languages)
      .map((r: any) => ({ name: r.languages.name, proficiency: r.proficiency })),
    interests: (profile_interests ?? [])
      .filter((r: any) => r.interests)
      .map((r: any) => r.interests.name),
    academic_records: scholar_academic_records ?? [],
  };
}

/**
 * Loads the signed-in user's profile. The profiles row is expected to be
 * created automatically by a database trigger when the auth user signs up.
 */
export function useProfile(): UseProfileResult {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: err } = await supabase
      .from("profiles")
      .select(PROFILE_SELECT)
      .eq("id", user.id)
      .single();

    if (err) {
      setError(err.message);
      setProfile(null);
    } else {
      setError(null);
      setProfile(shapeProfile(data as Record<string, any>));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const updateProfile = useCallback(
    async (changes: Partial<EditableProfile>) => {
      if (!user) return { error: "Not signed in" };
      const { error: err } = await supabase
        .from("profiles")
        .update({ ...changes, updated_at: new Date().toISOString() })
        .eq("id", user.id);

      if (err) return { error: err.message };
      await load();
      return { error: null };
    },
    [user, load],
  );

  return { profile, loading, error, updateProfile, reload: load };
}
