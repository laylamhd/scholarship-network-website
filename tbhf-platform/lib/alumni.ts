import { createClient } from "@/lib/supabase/server";

/** A row in the alumni directory (profile + career snapshot). */
export type AlumniCard = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  nationality: string | null;
  country: string | null;
  current_position: string | null;
  current_employer: string | null;
  industry: string | null;
  sector: string | null;
  years_of_experience: number | null;
  willing_to_mentor: boolean;
  linkedin_url: string | null;
};

/** A "giving back" offer published by an alumnus. */
export type OfferCard = {
  id: string;
  alumni_id: string;
  kind: string;
  title: string;
  details: string | null;
  is_open: boolean;
  created_at: string;
  author_name: string;
  author_avatar: string | null;
  interest_count: number;
  i_interested: boolean;
};

type AlumniRow = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  nationality: string | null;
  country: string | null;
  alumni_details: {
    current_position: string | null;
    current_employer: string | null;
    industry: string | null;
    sector: string | null;
    years_of_experience: number | null;
    willing_to_mentor: boolean | null;
    linkedin_url: string | null;
  } | null;
};

function toCard(r: AlumniRow): AlumniCard {
  const a = r.alumni_details;
  return {
    id: r.id,
    full_name: r.full_name,
    avatar_url: r.avatar_url,
    nationality: r.nationality,
    country: r.country,
    current_position: a?.current_position ?? null,
    current_employer: a?.current_employer ?? null,
    industry: a?.industry ?? null,
    sector: a?.sector ?? null,
    years_of_experience: a?.years_of_experience ?? null,
    willing_to_mentor: Boolean(a?.willing_to_mentor),
    linkedin_url: a?.linkedin_url ?? null,
  };
}

/** The alumni directory. RLS gates per-profile visibility. Optional JS search. */
export async function listAlumni(opts: { search?: string; mentorsOnly?: boolean } = {}): Promise<AlumniCard[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, avatar_url, nationality, country, alumni_details(current_position, current_employer, industry, sector, years_of_experience, willing_to_mentor, linkedin_url)",
    )
    .eq("role", "alumni")
    .eq("is_active", true)
    .order("full_name", { ascending: true });

  if (error) {
    console.error("listAlumni:", error.message);
    return [];
  }

  let cards = ((data as unknown as AlumniRow[]) ?? []).map(toCard);

  if (opts.mentorsOnly) cards = cards.filter((c) => c.willing_to_mentor);

  const term = opts.search?.trim().toLowerCase();
  if (term) {
    cards = cards.filter((c) =>
      [c.full_name, c.current_employer, c.current_position, c.industry, c.sector, c.country, c.nationality]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(term)),
    );
  }
  return cards;
}

/** Headline counts for the alumni hero. */
export async function getAlumniStats(): Promise<{ total: number; countries: number; mentors: number }> {
  const cards = await listAlumni();
  const countries = new Set(cards.map((c) => c.country).filter(Boolean)).size;
  const mentors = cards.filter((c) => c.willing_to_mentor).length;
  return { total: cards.length, countries, mentors };
}

type OfferRow = {
  id: string;
  alumni_id: string;
  kind: string;
  title: string;
  details: string | null;
  is_open: boolean;
  created_at: string;
  profiles: { full_name: string; avatar_url: string | null } | null;
  alumni_offer_interests: { profile_id: string }[] | null;
};

function toOffer(r: OfferRow, userId: string): OfferCard {
  const interests = r.alumni_offer_interests ?? [];
  return {
    id: r.id,
    alumni_id: r.alumni_id,
    kind: r.kind,
    title: r.title,
    details: r.details,
    is_open: r.is_open,
    created_at: r.created_at,
    author_name: r.profiles?.full_name ?? "Alumnus",
    author_avatar: r.profiles?.avatar_url ?? null,
    interest_count: interests.length,
    i_interested: interests.some((i) => i.profile_id === userId),
  };
}

/** "Ways alumni give back" — newest first. Optional filter by kind / author. */
export async function listOffers(opts: { userId: string; kind?: string; alumniId?: string; openOnly?: boolean } = { userId: "" }): Promise<OfferCard[]> {
  const supabase = await createClient();
  let query = supabase
    .from("alumni_offers")
    .select(
      "id, alumni_id, kind, title, details, is_open, created_at, profiles!alumni_offers_alumni_id_fkey(full_name, avatar_url), alumni_offer_interests(profile_id)",
    )
    .order("created_at", { ascending: false });

  if (opts.kind) query = query.eq("kind", opts.kind);
  if (opts.alumniId) query = query.eq("alumni_id", opts.alumniId);
  if (opts.openOnly) query = query.eq("is_open", true);

  const { data, error } = await query;
  if (error) {
    console.error("listOffers:", error.message);
    return [];
  }
  return ((data as unknown as OfferRow[]) ?? []).map((r) => toOffer(r, opts.userId));
}

/** Count of open offers per kind (for the filter chips). */
export async function getOfferKindCounts(): Promise<Record<string, number>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("alumni_offers").select("kind").eq("is_open", true);
  if (error) {
    console.error("getOfferKindCounts:", error.message);
    return {};
  }
  const counts: Record<string, number> = {};
  for (const row of (data as { kind: string }[]) ?? []) {
    counts[row.kind] = (counts[row.kind] ?? 0) + 1;
  }
  return counts;
}
