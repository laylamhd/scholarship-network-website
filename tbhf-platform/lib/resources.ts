import { createClient } from "@/lib/supabase/server";

export type ResourceCategory = {
  id: string;
  name: string;
  description: string | null;
};

export type ResourceItem = {
  id: string;
  title: string;
  description: string | null;
  resource_type: string;
  file_url: string | null;
  external_link: string | null;
  category_id: string | null;
  category_name: string | null;
  created_at: string;
  bookmarked: boolean;
};

export async function listCategories(): Promise<ResourceCategory[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("resource_categories")
    .select("id, name, description")
    .order("name", { ascending: true });
  return (data as ResourceCategory[]) ?? [];
}

export type CategoryWithCount = ResourceCategory & { count: number };

/** Categories plus how many published resources each holds. */
export async function listCategoriesWithCounts(): Promise<CategoryWithCount[]> {
  const supabase = await createClient();
  const [{ data: cats }, { data: rows }] = await Promise.all([
    supabase.from("resource_categories").select("id, name, description").order("name", { ascending: true }),
    supabase.from("resources").select("category_id").eq("is_published", true),
  ]);

  const counts = new Map<string, number>();
  (rows ?? []).forEach((r) => {
    const id = r.category_id as string | null;
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
  });

  return ((cats as ResourceCategory[]) ?? []).map((c) => ({ ...c, count: counts.get(c.id) ?? 0 }));
}

/** Allowed values of the resource_type enum (for the upload form). */
export async function getResourceTypes(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_enum_values", { enum_type: "resource_type" });
  if (error) return [];
  return (data as string[]) ?? [];
}

export async function listResources(opts: {
  userId: string;
  search?: string;
  categoryId?: string;
  savedOnly?: boolean;
}): Promise<ResourceItem[]> {
  const supabase = await createClient();

  let query = supabase
    .from("resources")
    .select("id, title, description, resource_type, file_url, external_link, category_id, created_at, resource_categories(name)")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(100);

  if (opts.categoryId) query = query.eq("category_id", opts.categoryId);
  const term = opts.search?.trim();
  if (term) query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%`);

  const [{ data, error }, { data: bookmarks }] = await Promise.all([
    query,
    supabase.from("resource_bookmarks").select("resource_id").eq("profile_id", opts.userId),
  ]);

  if (error) {
    console.error("listResources:", error.message);
    return [];
  }

  const saved = new Set((bookmarks ?? []).map((b) => b.resource_id as string));

  let items: ResourceItem[] = (data ?? []).map((r) => {
    const cat = r.resource_categories as unknown as { name: string } | null;
    return {
      id: r.id as string,
      title: r.title as string,
      description: (r.description as string) ?? null,
      resource_type: (r.resource_type as string) ?? "pdf",
      file_url: (r.file_url as string) ?? null,
      external_link: (r.external_link as string) ?? null,
      category_id: (r.category_id as string) ?? null,
      category_name: cat?.name ?? null,
      created_at: r.created_at as string,
      bookmarked: saved.has(r.id as string),
    };
  });

  if (opts.savedOnly) items = items.filter((i) => i.bookmarked);
  return items;
}
