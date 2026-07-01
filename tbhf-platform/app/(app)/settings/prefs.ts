// Plain module (NOT a "use server" file) so it can export constants and types.
// Notification preference categories surfaced on the Settings page.

export type NotifPrefs = Record<string, boolean>;

export type NotifGroup = {
  key: string;
  label: string;
  description: string;
};

export const NOTIF_GROUPS: NotifGroup[] = [
  { key: "messages", label: "Direct messages", description: "When someone sends you a private message." },
  { key: "community", label: "Community activity", description: "Likes and comments on your posts and discussions." },
  { key: "mentions", label: "Mentions", description: "When someone @mentions you in a community post or comment." },
  { key: "follows", label: "New followers", description: "When another scholar starts following you." },
  { key: "mentorship", label: "Mentorship", description: "Mentorship requests and updates on your requests." },
  { key: "content_review", label: "Content review", description: "When your submitted content is approved or needs changes." },
  { key: "events", label: "Events & webinars", description: "Reminders and updates for events you've registered for." },
  { key: "announcements", label: "Announcements", description: "Important updates from the TBHF team." },
];

// Every category is opt-out: a member receives a notification unless they have
// explicitly turned its category off.
export const DEFAULT_NOTIF_PREFS: NotifPrefs = Object.fromEntries(
  NOTIF_GROUPS.map((g) => [g.key, true]),
);

/** Merge stored prefs over the defaults so new categories default to "on". */
export function resolveNotifPrefs(stored: NotifPrefs | null | undefined): NotifPrefs {
  return { ...DEFAULT_NOTIF_PREFS, ...(stored ?? {}) };
}
