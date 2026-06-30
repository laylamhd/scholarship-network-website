// Client-safe: maps a notification's entity to an in-app link.
// No server imports here, so client components can use it freely.

export function notificationLink(n: { entity_type: string | null; entity_id: string | null }): string | null {
  if (!n.entity_id) return null;
  switch (n.entity_type) {
    case "stories": return `/stories/${n.entity_id}`;
    case "research_posts": return `/research/${n.entity_id}`;
    case "community_projects": return `/volunteer/${n.entity_id}`;
    case "showcase_items": return `/showcase/${n.entity_id}`;
    case "alumni_offers": return "/alumni";
    case "events": return "/events";
    case "conversations": return `/messages/${n.entity_id}`;
    case "profiles": return `/scholars/${n.entity_id}`;
    case "community_posts": return "/community";
    case "mentorships": return "/mentorship";
    case "admin_announcements": return "/";
    default: return null;
  }
}
