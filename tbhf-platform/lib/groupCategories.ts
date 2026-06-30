// Client-safe constants (no server imports), usable from client components.
export type GroupCategory = "university" | "country" | "thematic" | "other";

export const GROUP_CATEGORIES: { value: GroupCategory; label: string }[] = [
  { value: "university", label: "University community" },
  { value: "country", label: "Country community" },
  { value: "thematic", label: "Thematic group" },
  { value: "other", label: "Other" },
];

export function categoryLabel(value: string): string {
  return GROUP_CATEGORIES.find((c) => c.value === value)?.label ?? "Group";
}
