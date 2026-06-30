// Client-safe (no server imports): shared by the form, pages and lib.
import type { IconName } from "@/components/Icon";

export const RESEARCH_KINDS = ["Research summary", "Opportunity"] as const;
export type ResearchKind = (typeof RESEARCH_KINDS)[number];

export function researchKindIcon(kind: string): IconName {
  switch (kind) {
    case "Research summary": return "flask";
    case "Innovation idea": return "bulb";
    case "Dataset": return "database";
    case "Opportunity": return "award";
    default: return "flask";
  }
}

/** Accent colour per category (for badges / card accents in the magazine layout). */
export function researchKindColor(kind: string): string {
  switch (kind) {
    case "Research summary": return "#11A6D6";
    case "Innovation idea": return "#E0922E";
    case "Dataset": return "#0F8F6B";
    case "Opportunity": return "#7C5CD6";
    default: return "#11A6D6";
  }
}

export function researchKindBlurb(kind: string): string {
  switch (kind) {
    case "Research summary": return "Findings, papers & project write-ups";
    case "Innovation idea": return "Early ideas looking for feedback or a team";
    case "Dataset": return "Shared datasets for the community to build on";
    case "Opportunity": return "Research openings & challenge competitions";
    default: return "";
  }
}
