import { createClient } from "@/lib/supabase/server";
import type { QType } from "@/lib/surveyTypes";

export type SurveyOverview = {
  id: string;
  title: string;
  description: string | null;
  is_open: boolean;
  created_at: string;
  author_id: string;
  author_name: string;
  author_avatar: string | null;
  question_count: number;
  response_count: number;
  i_responded: boolean;
};

export type SurveyQuestion = {
  id: string;
  prompt: string;
  qtype: QType;
  options: string[];
  required: boolean;
  position: number;
};

export type SurveyForRespond = {
  id: string;
  title: string;
  description: string | null;
  is_open: boolean;
  author_id: string;
  author_name: string;
  questions: SurveyQuestion[];
  i_responded: boolean;
};

export type SurveyResults = {
  survey: { id: string; title: string; description: string | null; is_open: boolean; created_at: string };
  questions: SurveyQuestion[];
  response_count: number;
  responses: { submitted_at: string; answers: Record<string, unknown> }[];
};

/** All surveys for the /surveys list (privileged counts via RPC). */
export async function getSurveysOverview(): Promise<SurveyOverview[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_surveys_overview");
  if (error) {
    console.error("getSurveysOverview:", error.message);
    return [];
  }
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    title: r.title as string,
    description: (r.description as string) ?? null,
    is_open: Boolean(r.is_open),
    created_at: r.created_at as string,
    author_id: r.author_id as string,
    author_name: (r.author_name as string) ?? "Unknown",
    author_avatar: (r.author_avatar as string) ?? null,
    question_count: Number(r.question_count ?? 0),
    response_count: Number(r.response_count ?? 0),
    i_responded: Boolean(r.i_responded),
  }));
}

/** A single survey with its questions, for the respond page. */
export async function getSurveyForRespond(id: string, userId: string): Promise<SurveyForRespond | null> {
  const supabase = await createClient();
  const { data: s, error } = await supabase
    .from("surveys")
    .select("id, title, description, is_open, author_id, profiles!surveys_author_id_fkey(full_name)")
    .eq("id", id)
    .maybeSingle();
  if (error) console.error("getSurveyForRespond:", error.message);
  if (!s) return null;

  const { data: qs } = await supabase
    .from("survey_questions")
    .select("id, prompt, qtype, options, required, position")
    .eq("survey_id", id)
    .order("position", { ascending: true });

  const { data: mine } = await supabase
    .from("survey_responses")
    .select("id")
    .eq("survey_id", id)
    .eq("respondent_id", userId)
    .maybeSingle();

  const author = s.profiles as unknown as { full_name: string } | null;
  return {
    id: s.id as string,
    title: s.title as string,
    description: (s.description as string) ?? null,
    is_open: Boolean(s.is_open),
    author_id: s.author_id as string,
    author_name: author?.full_name ?? "Unknown",
    i_responded: Boolean(mine),
    questions: (qs ?? []).map((q) => ({
      id: q.id as string,
      prompt: q.prompt as string,
      qtype: q.qtype as QType,
      options: Array.isArray(q.options) ? (q.options as string[]) : [],
      required: Boolean(q.required),
      position: Number(q.position ?? 0),
    })),
  };
}

/** Owner / admin results (aggregate + raw anonymous answers) via RPC. */
export async function getSurveyResults(id: string): Promise<SurveyResults | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_survey_results", { p_survey_id: id });
  if (error) {
    console.error("getSurveyResults:", error.message);
    return null;
  }
  if (!data || !data.survey) return null;
  return data as SurveyResults;
}
