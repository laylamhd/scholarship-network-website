"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isChoice, type QType } from "@/lib/surveyTypes";

const QTYPE_SET: QType[] = ["short_text", "paragraph", "single_choice", "multi_choice", "rating"];

export type SurveyFormState = { error?: string } | null;

type IncomingQuestion = {
  prompt: string;
  qtype: QType;
  options: string[];
  required: boolean;
};

/** Create a survey + its questions. Questions are fixed once created. */
export async function createSurvey(_prev: SurveyFormState, formData: FormData): Promise<SurveyFormState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const raw = String(formData.get("questions") ?? "[]");

  if (!title) return { error: "A survey title is required." };

  let questions: IncomingQuestion[];
  try {
    questions = JSON.parse(raw);
  } catch {
    return { error: "Could not read the questions. Please try again." };
  }

  const clean = questions
    .map((q) => ({
      prompt: String(q.prompt ?? "").trim(),
      qtype: (QTYPE_SET.includes(q.qtype) ? q.qtype : "short_text") as QType,
      options: Array.isArray(q.options) ? q.options.map((o) => String(o).trim()).filter(Boolean) : [],
      required: Boolean(q.required),
    }))
    .filter((q) => q.prompt);

  if (clean.length === 0) return { error: "Add at least one question." };
  for (const q of clean) {
    if (isChoice(q.qtype) && q.options.length < 2) {
      return { error: `“${q.prompt}” needs at least two options.` };
    }
  }

  const { data: survey, error: sErr } = await supabase
    .from("surveys")
    .insert({ author_id: user.id, title, description })
    .select("id")
    .single();
  if (sErr || !survey) return { error: sErr?.message ?? "Could not create the survey." };

  const rows = clean.map((q, i) => ({
    survey_id: survey.id,
    position: i,
    prompt: q.prompt,
    qtype: q.qtype,
    options: isChoice(q.qtype) ? q.options : [],
    required: q.required,
  }));
  const { error: qErr } = await supabase.from("survey_questions").insert(rows);
  if (qErr) {
    await supabase.from("surveys").delete().eq("id", survey.id);
    return { error: qErr.message };
  }

  revalidatePath("/research");
  redirect(`/surveys/${survey.id}/results`);
}

/** Submit one anonymous response (via SECURITY DEFINER RPC). */
export async function submitSurveyResponse(
  surveyId: string,
  answers: { question_id: string; value: unknown }[],
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase.rpc("submit_survey_response", {
    p_survey_id: surveyId,
    p_answers: answers,
  });
  if (error) return { error: error.message };

  revalidatePath(`/surveys/${surveyId}`);
  revalidatePath("/research");
  return {};
}

export async function setSurveyOpen(id: string, open: boolean): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("surveys")
    .update({ is_open: open, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/surveys/${id}`);
  revalidatePath(`/surveys/${id}/results`);
  revalidatePath("/research");
  return {};
}

export async function deleteSurvey(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("surveys").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/research");
  redirect("/research?view=surveys");
}
