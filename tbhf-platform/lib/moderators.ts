// Client-safe moderator metadata (no server imports — importable from client
// components). The capability keys mirror admin_set_moderator() in
// supabase/phase19_moderators.sql; keep the two in sync.
import type { IconName } from "@/components/Icon";

export type ModeratorCapability =
  | "moderate_content"
  | "manage_announcements"
  | "manage_events_resources"
  | "manage_communities";

export const MODERATOR_CAPS: {
  key: ModeratorCapability;
  label: string;
  desc: string;
  icon: IconName;
}[] = [
  {
    key: "moderate_content",
    label: "Review & moderate content",
    desc: "Approve or reject member submissions — stories, research, projects, showcase, events and offers.",
    icon: "clipboard",
  },
  {
    key: "manage_announcements",
    label: "Post announcements",
    desc: "Create and manage the announcements members see in their banner.",
    icon: "mail",
  },
  {
    key: "manage_events_resources",
    label: "Manage events & resources",
    desc: "Create and manage events, webinars and the knowledge library.",
    icon: "calendar",
  },
  {
    key: "manage_communities",
    label: "Manage communities & groups",
    desc: "Moderate community and group content.",
    icon: "users",
  },
];

export const MODERATOR_CAP_KEYS = MODERATOR_CAPS.map((c) => c.key);

export function capLabel(key: string): string {
  return MODERATOR_CAPS.find((c) => c.key === key)?.label ?? key;
}

export type Moderator = {
  profile_id: string;
  full_name: string;
  email: string;
  role: string;
  capabilities: string[];
  granted_at: string;
};
