// Client-safe (no server imports): shared by the form, pages and lib.
import type { IconName } from "@/components/Icon";

export const STORY_CATEGORIES = [
  "Personal stories",
  "Academic journeys",
  "Research insights",
  "Community projects",
  "Cultural experiences",
  "Photography essays",
] as const;

export type StoryCategory = (typeof STORY_CATEGORIES)[number];

export function storyCategoryIcon(category: string): IconName {
  switch (category) {
    case "Personal stories": return "heart";
    case "Academic journeys": return "cap";
    case "Research insights": return "flask";
    case "Community projects": return "users";
    case "Cultural experiences": return "globe";
    case "Photography essays": return "monitor";
    default: return "fileText";
  }
}
