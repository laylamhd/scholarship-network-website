// Client-safe (no server imports): shared by the form, pages and lib.
import type { IconName } from "@/components/Icon";

export const EVENT_TYPES = [
  "Career workshop",
  "Leadership training",
  "Guest lecture",
  "Networking session",
  "University fair",
  "Scholarship orientation",
  "Webinar",
  "Other",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

/** Pretty label for a raw event_mode enum value (e.g. "in_person" -> "In person"). */
export function formatMode(mode: string | null): string {
  if (!mode) return "";
  const s = mode.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Whether a mode implies an online/virtual component (for join-link UI). */
export function isOnlineMode(mode: string | null): boolean {
  return /online|virtual|hybrid|webinar/i.test(mode ?? "");
}

/**
 * Enforces the DB constraint events_location_or_link:
 *   online    -> online_link required
 *   in_person -> location required
 *   hybrid    -> both required
 * Returns an error message, or null when valid.
 */
export function eventPlaceError(mode: string, location: string | null, onlineLink: string | null): string | null {
  if (mode === "online") return onlineLink ? null : "Online events need a joining link.";
  if (mode === "in_person") return location ? null : "In-person events need a location.";
  if (mode === "hybrid") {
    if (!onlineLink) return "Hybrid events need a joining link.";
    if (!location) return "Hybrid events also need a location.";
    return null;
  }
  return null;
}

export function eventTypeIcon(type: string): IconName {
  switch (type) {
    case "Career workshop": return "briefcase";
    case "Leadership training": return "award";
    case "Guest lecture": return "mic";
    case "Networking session": return "users";
    case "University fair": return "cap";
    case "Scholarship orientation": return "compass";
    case "Webinar": return "monitor";
    default: return "calendar";
  }
}
