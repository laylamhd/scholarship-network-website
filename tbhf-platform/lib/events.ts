import { createClient } from "@/lib/supabase/server";

export type EventItem = {
  id: string;
  title: string;
  description: string | null;
  event_type: string | null;
  mode: string; // event_mode enum value (online / in_person / hybrid …)
  cover_image_url: string | null;
  location: string | null;
  online_link: string | null;
  start_at: string;
  end_at: string | null;
  registration_link: string | null;
  recording_url: string | null;
  capacity: number | null;
  created_at: string;
  created_by: string;
  review_status: string; // 'pending' | 'approved' | 'rejected'
  going_count: number;
  my_status: string | null; // 'going' | 'interested' | null
};

async function rsvpInfo(eventIds: string[], userId: string) {
  const supabase = await createClient();
  if (eventIds.length === 0) return { counts: new Map<string, number>(), mine: new Map<string, string>() };
  const [{ data: all }, { data: mineRows }] = await Promise.all([
    supabase.from("event_rsvps").select("event_id, status").in("event_id", eventIds),
    supabase.from("event_rsvps").select("event_id, status").eq("profile_id", userId).in("event_id", eventIds),
  ]);
  const counts = new Map<string, number>();
  (all ?? []).forEach((r) => {
    if (r.status === "going") counts.set(r.event_id as string, (counts.get(r.event_id as string) ?? 0) + 1);
  });
  const mine = new Map<string, string>();
  (mineRows ?? []).forEach((r) => mine.set(r.event_id as string, r.status as string));
  return { counts, mine };
}

function mapRow(r: Record<string, unknown>, counts: Map<string, number>, mine: Map<string, string>): EventItem {
  const id = r.id as string;
  return {
    id,
    title: r.title as string,
    description: (r.description as string) ?? null,
    event_type: (r.event_type as string) ?? null,
    mode: (r.mode as string) ?? "online",
    cover_image_url: (r.cover_image_url as string) ?? null,
    location: (r.location as string) ?? null,
    online_link: (r.online_link as string) ?? null,
    start_at: r.start_at as string,
    end_at: (r.end_at as string) ?? null,
    registration_link: (r.registration_link as string) ?? null,
    recording_url: (r.recording_url as string) ?? null,
    capacity: (r.capacity as number) ?? null,
    created_at: r.created_at as string,
    created_by: r.created_by as string,
    review_status: (r.review_status as string) ?? "approved",
    going_count: counts.get(id) ?? 0,
    my_status: mine.get(id) ?? null,
  };
}

const SELECT =
  "id, title, description, event_type, mode, cover_image_url, location, online_link, start_at, end_at, registration_link, recording_url, capacity, created_at, created_by, review_status";

/** Upcoming + past events (split around now), optionally filtered by type. */
export async function listEvents(opts: {
  userId: string;
  type?: string;
}): Promise<{ upcoming: EventItem[]; past: EventItem[] }> {
  const supabase = await createClient();
  let query = supabase.from("events").select(SELECT).order("start_at", { ascending: true }).limit(200);
  if (opts.type) query = query.eq("event_type", opts.type);

  const { data, error } = await query;
  if (error) {
    console.error("listEvents:", error.message);
    return { upcoming: [], past: [] };
  }

  const rows = data ?? [];
  const { counts, mine } = await rsvpInfo(rows.map((r) => r.id as string), opts.userId);
  const now = Date.now();
  const upcoming: EventItem[] = [];
  const past: EventItem[] = [];
  rows.forEach((r) => {
    const item = mapRow(r as Record<string, unknown>, counts, mine);
    const ref = item.end_at ?? item.start_at;
    if (new Date(ref).getTime() >= now) upcoming.push(item);
    else past.push(item);
  });
  past.reverse(); // most recent past first
  return { upcoming, past };
}

/** event_type -> count, for the filter chips. */
export async function getEventTypeCounts(): Promise<Map<string, number>> {
  const supabase = await createClient();
  const { data } = await supabase.from("events").select("event_type");
  const counts = new Map<string, number>();
  (data ?? []).forEach((r) => {
    const t = r.event_type as string | null;
    if (t) counts.set(t, (counts.get(t) ?? 0) + 1);
  });
  return counts;
}

export async function getEvent(id: string, userId: string): Promise<EventItem | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("events").select(SELECT).eq("id", id).maybeSingle();
  if (error) console.error("getEvent:", error.message);
  if (!data) return null;
  const { counts, mine } = await rsvpInfo([data.id as string], userId);
  return mapRow(data as Record<string, unknown>, counts, mine);
}
