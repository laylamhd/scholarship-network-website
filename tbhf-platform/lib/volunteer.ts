import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";

export type ProjectCard = {
  id: string;
  title: string;
  description: string;
  cause: string;
  location: string | null;
  image_url: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  outcome: string | null;
  created_at: string;
  organizer_id: string;
  organizer_name: string;
  organizer_avatar: string | null;
  organizer_role: UserRole;
  volunteer_count: number;
  i_volunteer: boolean;
};

export type VolunteerRow = {
  profile_id: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  joined_at: string;
};

export type HourEntry = {
  id: string;
  hours: number;
  activity: string | null;
  logged_date: string;
  project_id: string | null;
  project_title: string | null;
};

type OrgRow = { id: string; full_name: string; avatar_url: string | null; role: UserRole };

function mapOrg(o: OrgRow | null) {
  return {
    organizer_name: o?.full_name ?? "Unknown",
    organizer_avatar: o?.avatar_url ?? null,
    organizer_role: (o?.role as UserRole) ?? "scholar",
  };
}

async function volunteerInfo(projectIds: string[], userId: string) {
  const supabase = await createClient();
  if (projectIds.length === 0) return { counts: new Map<string, number>(), mine: new Set<string>() };
  const [{ data: all }, { data: mineRows }] = await Promise.all([
    supabase.from("project_volunteers").select("project_id").in("project_id", projectIds),
    supabase.from("project_volunteers").select("project_id").eq("profile_id", userId).in("project_id", projectIds),
  ]);
  const counts = new Map<string, number>();
  (all ?? []).forEach((r) => counts.set(r.project_id as string, (counts.get(r.project_id as string) ?? 0) + 1));
  const mine = new Set((mineRows ?? []).map((r) => r.project_id as string));
  return { counts, mine };
}

const SELECT =
  "id, title, description, cause, location, image_url, start_date, end_date, status, outcome, created_at, organizer_id, profiles!community_projects_organizer_id_fkey(id, full_name, avatar_url, role)";

function mapRow(r: Record<string, unknown>, counts: Map<string, number>, mine: Set<string>): ProjectCard {
  const id = r.id as string;
  return {
    id,
    title: r.title as string,
    description: r.description as string,
    cause: r.cause as string,
    location: (r.location as string) ?? null,
    image_url: (r.image_url as string) ?? null,
    start_date: (r.start_date as string) ?? null,
    end_date: (r.end_date as string) ?? null,
    status: r.status as string,
    outcome: (r.outcome as string) ?? null,
    created_at: r.created_at as string,
    organizer_id: r.organizer_id as string,
    ...mapOrg(r.profiles as unknown as OrgRow | null),
    volunteer_count: counts.get(id) ?? 0,
    i_volunteer: mine.has(id),
  };
}

export async function listProjects(opts: {
  userId: string;
  cause?: string;
  search?: string;
  status?: string;
  mineOnly?: boolean;
  joinedIds?: string[];
}): Promise<ProjectCard[]> {
  const supabase = await createClient();
  if (opts.joinedIds && opts.joinedIds.length === 0) return [];

  let query = supabase.from("community_projects").select(SELECT).order("created_at", { ascending: false }).limit(120);
  if (opts.mineOnly) query = query.eq("organizer_id", opts.userId);
  if (opts.joinedIds) query = query.in("id", opts.joinedIds);
  if (opts.cause) query = query.eq("cause", opts.cause);
  if (opts.status) query = query.eq("status", opts.status);
  const term = opts.search?.trim();
  if (term) query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%,location.ilike.%${term}%`);

  const { data, error } = await query;
  if (error) {
    console.error("listProjects:", error.message);
    return [];
  }
  const rows = data ?? [];
  const { counts, mine } = await volunteerInfo(rows.map((r) => r.id as string), opts.userId);
  return rows.map((r) => mapRow(r as Record<string, unknown>, counts, mine));
}

export async function getProject(id: string, userId: string): Promise<ProjectCard | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("community_projects").select(SELECT).eq("id", id).maybeSingle();
  if (error) console.error("getProject:", error.message);
  if (!data) return null;
  const { counts, mine } = await volunteerInfo([data.id as string], userId);
  return mapRow(data as Record<string, unknown>, counts, mine);
}

export async function getProjectVolunteers(projectId: string): Promise<VolunteerRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_volunteers")
    .select("joined_at, profiles!project_volunteers_profile_id_fkey(id, full_name, avatar_url, role)")
    .eq("project_id", projectId)
    .order("joined_at", { ascending: true });
  if (error) {
    console.error("getProjectVolunteers:", error.message);
    return [];
  }
  return (data ?? []).map((r) => {
    const p = r.profiles as unknown as OrgRow | null;
    return {
      profile_id: p?.id ?? "",
      full_name: p?.full_name ?? "Unknown",
      avatar_url: p?.avatar_url ?? null,
      role: (p?.role as UserRole) ?? "scholar",
      joined_at: r.joined_at as string,
    };
  });
}

/** Project ids the user has signed up to volunteer for. */
export async function getJoinedProjectIds(userId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("project_volunteers").select("project_id").eq("profile_id", userId);
  return (data ?? []).map((r) => r.project_id as string);
}

export async function getCauseCounts(): Promise<Map<string, number>> {
  const supabase = await createClient();
  const { data } = await supabase.from("community_projects").select("cause");
  const counts = new Map<string, number>();
  (data ?? []).forEach((r) => counts.set(r.cause as string, (counts.get(r.cause as string) ?? 0) + 1));
  return counts;
}

export type Impact = { totalHours: number; projectsJoined: number; entries: HourEntry[] };

export async function getMyImpact(userId: string): Promise<Impact> {
  const supabase = await createClient();
  const [{ data: hours }, joined] = await Promise.all([
    supabase
      .from("volunteer_hours")
      .select("id, hours, activity, logged_date, project_id, community_projects(title)")
      .eq("profile_id", userId)
      .order("logged_date", { ascending: false })
      .limit(50),
    getJoinedProjectIds(userId),
  ]);

  const entries: HourEntry[] = (hours ?? []).map((h) => ({
    id: h.id as string,
    hours: Number(h.hours),
    activity: (h.activity as string) ?? null,
    logged_date: h.logged_date as string,
    project_id: (h.project_id as string) ?? null,
    project_title: ((h.community_projects as unknown as { title?: string } | null)?.title) ?? null,
  }));
  const totalHours = entries.reduce((s, e) => s + e.hours, 0);
  return { totalHours, projectsJoined: joined.length, entries };
}
