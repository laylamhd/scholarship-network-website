"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { listAlumni } from "@/lib/alumni";
import { ALUMNI_OFFER_KINDS } from "@/lib/alumniOffers";

export type AlumniSuggestion = { id: string; name: string; sub: string | null };

/** Live typeahead suggestions for the alumni directory search box. */
export async function searchAlumni(q: string): Promise<AlumniSuggestion[]> {
  const term = q.trim();
  if (!term) return [];
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const alumni = await listAlumni({ search: term });
  return alumni.slice(0, 6).map((a) => ({
    id: a.id,
    name: a.full_name,
    sub: [a.current_position, a.current_employer].filter(Boolean).join(" · ") || a.country || null,
  }));
}

export type OfferFormState = { error?: string } | null;

function parseOffer(formData: FormData) {
  return {
    kind: String(formData.get("kind") ?? "").trim(),
    title: String(formData.get("title") ?? "").trim(),
    details: String(formData.get("details") ?? "").trim() || null,
    is_open: String(formData.get("is_open") ?? "true") === "true",
  };
}

function validateOffer(p: ReturnType<typeof parseOffer>): string | null {
  if (!ALUMNI_OFFER_KINDS.includes(p.kind as (typeof ALUMNI_OFFER_KINDS)[number])) return "Please choose a type.";
  if (!p.title) return "A short title is required.";
  return null;
}

export async function createOffer(_prev: OfferFormState, formData: FormData): Promise<OfferFormState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const p = parseOffer(formData);
  const err = validateOffer(p);
  if (err) return { error: err };

  const { error } = await supabase.from("alumni_offers").insert({ ...p, alumni_id: user.id });
  if (error) return { error: error.message };
  revalidatePath("/alumni");
  return null;
}

export async function updateOffer(id: string, _prev: OfferFormState, formData: FormData): Promise<OfferFormState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const p = parseOffer(formData);
  const err = validateOffer(p);
  if (err) return { error: err };

  const { error } = await supabase
    .from("alumni_offers")
    .update({ ...p, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/alumni");
  return null;
}

export async function deleteOffer(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("alumni_offers").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/alumni");
  return {};
}

/** Toggle whether the offer is still accepting interest. */
export async function toggleOfferOpen(id: string, open: boolean): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("alumni_offers")
    .update({ is_open: !open, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/alumni");
  return {};
}

/** Scholar expresses (or withdraws) interest in an offer. */
export async function toggleOfferInterest(offerId: string, interested: boolean): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  if (interested) {
    const { error } = await supabase
      .from("alumni_offer_interests")
      .delete()
      .eq("offer_id", offerId)
      .eq("profile_id", user.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("alumni_offer_interests")
      .upsert({ offer_id: offerId, profile_id: user.id }, { onConflict: "offer_id,profile_id" });
    if (error) return { error: error.message };
  }
  revalidatePath("/alumni");
  return {};
}
