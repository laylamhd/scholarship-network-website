import { createClient } from "@/lib/supabase/server";

export type OpportunityItem = {
  id: string;
  title: string;
  company_name: string;
  opportunity_type: string;
  description: string;
  location: string | null;
  is_remote: boolean;
  application_link: string;
  deadline: string | null;
  status: string;
  created_at: string;
  bookmarked: boolean;
  applied: boolean;
};

/** Allowed values of the opportunity_type enum (for filters + form). */
export async function getOpportunityTypes(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_enum_values", { enum_type: "opportunity_type" });
  if (error) return [];
  return (data as string[]) ?? [];
}

export type OpportunityTypeCount = { type: string; count: number };

/** Each opportunity type with how many opportunities it holds. */
export async function getOpportunityTypeCounts(): Promise<OpportunityTypeCount[]> {
  const supabase = await createClient();
  const [types, { data: rows }] = await Promise.all([
    getOpportunityTypes(),
    supabase.from("opportunities").select("opportunity_type"),
  ]);

  const counts = new Map<string, number>();
  (rows ?? []).forEach((r) => {
    const t = r.opportunity_type as string;
    counts.set(t, (counts.get(t) ?? 0) + 1);
  });

  return types.map((t) => ({ type: t, count: counts.get(t) ?? 0 }));
}

export async function listOpportunities(opts: {
  userId: string;
  search?: string;
  type?: string;
  savedOnly?: boolean;
  appliedOnly?: boolean;
}): Promise<OpportunityItem[]> {
  const supabase = await createClient();

  let query = supabase
    .from("opportunities")
    .select("id, title, company_name, opportunity_type, description, location, is_remote, application_link, deadline, status, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (opts.type) query = query.eq("opportunity_type", opts.type);
  const term = opts.search?.trim();
  if (term) query = query.or(`title.ilike.%${term}%,company_name.ilike.%${term}%,description.ilike.%${term}%`);

  const [{ data, error }, { data: bookmarks }, { data: apps }] = await Promise.all([
    query,
    supabase.from("opportunity_bookmarks").select("opportunity_id").eq("profile_id", opts.userId),
    supabase.from("opportunity_applications").select("opportunity_id").eq("profile_id", opts.userId),
  ]);

  if (error) {
    console.error("listOpportunities:", error.message);
    return [];
  }

  const saved = new Set((bookmarks ?? []).map((b) => b.opportunity_id as string));
  const applied = new Set((apps ?? []).map((a) => a.opportunity_id as string));

  let items: OpportunityItem[] = (data ?? []).map((o) => ({
    id: o.id as string,
    title: o.title as string,
    company_name: o.company_name as string,
    opportunity_type: o.opportunity_type as string,
    description: o.description as string,
    location: (o.location as string) ?? null,
    is_remote: Boolean(o.is_remote),
    application_link: o.application_link as string,
    deadline: (o.deadline as string) ?? null,
    status: (o.status as string) ?? "open",
    created_at: o.created_at as string,
    bookmarked: saved.has(o.id as string),
    applied: applied.has(o.id as string),
  }));

  if (opts.savedOnly) items = items.filter((i) => i.bookmarked);
  if (opts.appliedOnly) items = items.filter((i) => i.applied);
  return items;
}
