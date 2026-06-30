// Client-safe (no server imports): shared by the form, pages and lib.
import type { IconName } from "@/components/Icon";

export const SHOWCASE_TYPES = ["Photo", "Video", "Poster", "Artwork", "Presentation"] as const;
export type ShowcaseType = (typeof SHOWCASE_TYPES)[number];

/** Plural label for filters / headings. */
export function showcaseTypePlural(type: string): string {
  switch (type) {
    case "Photo": return "Photos";
    case "Video": return "Videos";
    case "Poster": return "Posters";
    case "Artwork": return "Artworks";
    case "Presentation": return "Presentations";
    default: return type;
  }
}

export function showcaseTypeIcon(type: string): IconName {
  switch (type) {
    case "Photo": return "image";
    case "Video": return "play";
    case "Poster": return "award";
    case "Artwork": return "palette";
    case "Presentation": return "slides";
    default: return "image";
  }
}

/** True for media we render as a plain image. */
export function isImageType(type: string): boolean {
  return type === "Photo" || type === "Poster" || type === "Artwork";
}

/** True if a URL points to a PDF file (so we can render its first page inline). */
export function isPdf(url: string | null): boolean {
  if (!url) return false;
  return url.split("?")[0].toLowerCase().endsWith(".pdf");
}

/** Browser PDF-viewer hints to show a clean first page (no toolbar, fit width). */
export const PDF_COVER_HASH = "#toolbar=0&navpanes=0&scrollbar=0&view=FitH&page=1";

/** Turn a YouTube/Vimeo URL into an embeddable URL, or null if not recognised. */
export function toEmbedUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace("www.", "");
    if (host === "youtu.be") return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    if (host.endsWith("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
      if (u.pathname.startsWith("/embed/")) return url;
    }
    if (host.endsWith("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
    }
  } catch {
    return null;
  }
  return null;
}
