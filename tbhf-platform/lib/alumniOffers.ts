// Client-safe constants for alumni "giving back" offers.
// No server imports here — safe to import from client components.
import type { IconName } from "@/components/Icon";

export const ALUMNI_OFFER_KINDS = [
  "Mentorship",
  "Speaking",
  "Internship/Job referral",
  "CV & interview review",
  "Industry insights",
  "Networking intro",
  "Giving back",
  "Other",
] as const;

export type AlumniOfferKind = (typeof ALUMNI_OFFER_KINDS)[number];

export function offerKindIcon(kind: string): IconName {
  switch (kind) {
    case "Mentorship": return "handshake";
    case "Speaking": return "mic";
    case "Internship/Job referral": return "briefcase";
    case "CV & interview review": return "fileText";
    case "Industry insights": return "bulb";
    case "Networking intro": return "users";
    case "Giving back": return "heart";
    default: return "sparkle";
  }
}

export function offerKindColor(kind: string): string {
  switch (kind) {
    case "Mentorship": return "#11A6D6";
    case "Speaking": return "#E0922E";
    case "Internship/Job referral": return "#0F8F6B";
    case "CV & interview review": return "#7C5CD6";
    case "Industry insights": return "#C9508A";
    case "Networking intro": return "#3B7DD8";
    case "Giving back": return "#D9534F";
    default: return "#5A6A72";
  }
}

export function offerKindBlurb(kind: string): string {
  switch (kind) {
    case "Mentorship": return "Guide a scholar one-to-one";
    case "Speaking": return "Speak at an event or session";
    case "Internship/Job referral": return "Open doors at your organisation";
    case "CV & interview review": return "Review CVs and run mock interviews";
    case "Industry insights": return "Share how your field really works";
    case "Networking intro": return "Introduce scholars to your network";
    case "Giving back": return "Support the next generation";
    default: return "Another way to help";
  }
}
