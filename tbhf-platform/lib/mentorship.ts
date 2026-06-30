import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";

export type MentorCard = {
  mentor_id: string;
  full_name: string;
  avatar_url: string | null;
  nationality: string | null;
  country: string | null;
  current_position: string | null;
  current_employer: string | null;
  industry: string | null;
  sector: string | null;
  years_of_experience: number | null;
  mentorship_topics: string | null;
  my_status: string | null; // 'pending' | 'active' | null
  my_mentorship_id: string | null;
};

export type MentorshipItem = {
  id: string;
  role: "mentee" | "mentor"; // viewer's role
  counterpart_id: string;
  counterpart_name: string;
  counterpart_avatar: string | null;
  counterpart_role: UserRole;
  counterpart_sub: string | null;
  message: string | null;
  status: "pending" | "active" | "declined" | "ended";
  created_at: string;
};

/** Alumni who are available to mentor (with my request status), optional search. */
export async function listMentors(search?: string): Promise<MentorCard[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_mentors", {
    p_search: search?.trim() || null,
  });
  if (error) {
    console.error("listMentors:", error.message);
    return [];
  }
  return (data as MentorCard[]) ?? [];
}

/** All of the viewer's mentorships, both as mentee and as mentor. */
export async function getMyMentorships(): Promise<MentorshipItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_mentorships");
  if (error) {
    console.error("getMyMentorships:", error.message);
    return [];
  }
  return (data as MentorshipItem[]) ?? [];
}

/** The viewer's own mentor availability (willing + topics), if they are alumni. */
export async function getMyMentorAvailability(
  userId: string,
): Promise<{ willing: boolean; topics: string | null }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("alumni_details")
    .select("willing_to_mentor, mentorship_topics")
    .eq("profile_id", userId)
    .maybeSingle();
  return {
    willing: Boolean(data?.willing_to_mentor),
    topics: (data?.mentorship_topics as string) ?? null,
  };
}
