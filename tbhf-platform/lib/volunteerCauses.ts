// Client-safe (no server imports): shared by the form, pages and lib.
import type { IconName } from "@/components/Icon";

export const VOLUNTEER_CAUSES = [
  "Education",
  "Health & wellbeing",
  "Environment",
  "Humanitarian",
  "Community",
  "Arts & culture",
  "Other",
] as const;

export type VolunteerCause = (typeof VOLUNTEER_CAUSES)[number];

export function causeIcon(cause: string): IconName {
  switch (cause) {
    case "Education": return "cap";
    case "Health & wellbeing": return "heart";
    case "Environment": return "globe";
    case "Humanitarian": return "handshake";
    case "Community": return "users";
    case "Arts & culture": return "palette";
    default: return "sparkle";
  }
}

export function causeColor(cause: string): string {
  switch (cause) {
    case "Education": return "#11A6D6";
    case "Health & wellbeing": return "#E5484D";
    case "Environment": return "#0F8F6B";
    case "Humanitarian": return "#E0922E";
    case "Community": return "#7C5CD6";
    case "Arts & culture": return "#D6457C";
    default: return "#5A6A72";
  }
}

export const PROJECT_STATUSES = ["recruiting", "ongoing", "completed"] as const;

export function statusLabel(status: string): string {
  switch (status) {
    case "recruiting": return "Recruiting volunteers";
    case "ongoing": return "Ongoing";
    case "completed": return "Completed";
    default: return status;
  }
}
