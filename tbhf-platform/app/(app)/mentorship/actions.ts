"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { listMentors } from "@/lib/mentorship";

export type MentorSuggestion = {
  mentor_id: string;
  full_name: string;
  avatar_url: string | null;
  place: string | null; // nationality · country
  topics: string | null; // what they mentor on
};

/** Live typeahead suggestions for the "Find a mentor" search box. */
export async function searchMentors(q: string): Promise<MentorSuggestion[]> {
  const term = q.trim();
  if (!term) return [];
  const mentors = await listMentors(term);
  return mentors.slice(0, 6).map((m) => ({
    mentor_id: m.mentor_id,
    full_name: m.full_name,
    avatar_url: m.avatar_url,
    place: [m.nationality, m.country].filter(Boolean).join(" · ") || null,
    topics: m.mentorship_topics?.trim() || null,
  }));
}

export async function requestMentorship(
  mentorId: string,
  message: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_mentorship", {
    p_mentor_id: mentorId,
    p_message: message.trim(),
  });
  if (error) return { error: friendly(error.message) };
  revalidatePath("/mentorship");
  return {};
}

export async function respondMentorship(
  id: string,
  accept: boolean,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_mentorship", {
    p_id: id,
    p_accept: accept,
  });
  if (error) return { error: friendly(error.message) };
  revalidatePath("/mentorship");
  return {};
}

export async function endMentorship(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("end_mentorship", { p_id: id });
  if (error) return { error: friendly(error.message) };
  revalidatePath("/mentorship");
  return {};
}

export async function setMentorAvailability(
  available: boolean,
  topics: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_mentor_availability", {
    p_available: available,
    p_topics: topics.trim(),
  });
  if (error) return { error: friendly(error.message) };
  revalidatePath("/mentorship");
  return {};
}

/** Surface the RPC's raised message, stripped of Postgres noise. */
function friendly(msg: string): string {
  return msg.replace(/^.*?:\s*/, "").trim() || "Something went wrong.";
}
