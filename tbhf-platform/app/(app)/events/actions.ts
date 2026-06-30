"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EVENT_TYPES, eventPlaceError } from "@/lib/eventTypes";

export type EventFormState = { error?: string } | null;

function toIso(v: string): string | null {
  const s = v.trim();
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export async function createEvent(_prev: EventFormState, formData: FormData): Promise<EventFormState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const title = String(formData.get("title") ?? "").trim();
  const event_type = String(formData.get("event_type") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const mode = String(formData.get("mode") ?? "").trim() || "online";
  const location = String(formData.get("location") ?? "").trim() || null;
  const online_link = String(formData.get("online_link") ?? "").trim() || null;
  const start_at = toIso(String(formData.get("start_at") ?? ""));
  const end_at = toIso(String(formData.get("end_at") ?? ""));
  const cover_image_url = String(formData.get("cover_image_url") ?? "").trim() || null;
  const registration_link = String(formData.get("registration_link") ?? "").trim() || null;
  const recording_url = String(formData.get("recording_url") ?? "").trim() || null;

  if (!title) return { error: "A title is required." };
  if (!EVENT_TYPES.includes(event_type as (typeof EVENT_TYPES)[number])) return { error: "Please choose an event type." };
  if (!start_at) return { error: "A start date & time is required." };
  const placeErr = eventPlaceError(mode, location, online_link);
  if (placeErr) return { error: placeErr };

  // The existing events.status enum defaults to 'draft'; publish on create
  // by choosing a published-like value if the enum provides one.
  const { data: statuses } = await supabase.rpc("get_enum_values", { enum_type: "event_status" });
  const publishedStatus = (statuses as string[] | null)?.find((s) =>
    ["published", "active", "upcoming", "open", "scheduled"].includes(s.toLowerCase()),
  );

  const { data, error } = await supabase
    .from("events")
    .insert({
      title, event_type, description, mode, location, online_link,
      start_at, end_at, cover_image_url, registration_link, recording_url,
      created_by: user.id,
      ...(publishedStatus ? { status: publishedStatus } : {}),
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/events");
  redirect(`/events/${data.id}`);
}

/** Notion-style inline quick-add from a calendar day cell (admin only). No redirect. */
export async function quickCreateEvent(input: {
  title: string;
  event_type: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  mode: string;
  location: string;
  online_link: string;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const title = input.title.trim();
  if (!title) return { error: "A title is required." };
  if (!EVENT_TYPES.includes(input.event_type as (typeof EVENT_TYPES)[number])) return { error: "Please choose a type." };
  const start_at = toIso(`${input.date}T${input.time || "09:00"}`);
  if (!start_at) return { error: "Invalid date/time." };

  const mode = input.mode || "online";
  const location = input.location.trim() || null;
  const online_link = input.online_link.trim() || null;
  const placeErr = eventPlaceError(mode, location, online_link);
  if (placeErr) return { error: placeErr };

  const { data: statuses } = await supabase.rpc("get_enum_values", { enum_type: "event_status" });
  const publishedStatus = (statuses as string[] | null)?.find((s) =>
    ["published", "active", "upcoming", "open", "scheduled"].includes(s.toLowerCase()),
  );

  const { error } = await supabase.from("events").insert({
    title,
    event_type: input.event_type,
    mode,
    location,
    online_link,
    start_at,
    created_by: user.id,
    ...(publishedStatus ? { status: publishedStatus } : {}),
  });
  if (error) return { error: error.message };
  revalidatePath("/events");
  return {};
}

export async function deleteEvent(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/events");
  redirect("/events");
}

/** Toggle / set the current user's RSVP. Pass null to remove. */
export async function setRsvp(eventId: string, status: "going" | "interested" | null): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  if (status === null) {
    const { error } = await supabase.from("event_rsvps").delete().eq("event_id", eventId).eq("profile_id", user.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("event_rsvps").upsert(
      { event_id: eventId, profile_id: user.id, status },
      { onConflict: "event_id,profile_id" },
    );
    if (error) return { error: error.message };
  }
  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  return {};
}
