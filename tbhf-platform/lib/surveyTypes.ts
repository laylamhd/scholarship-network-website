// Client-safe (no server imports): shared by the builder, response form, pages.
import type { IconName } from "@/components/Icon";

export type QType = "short_text" | "paragraph" | "single_choice" | "multi_choice" | "rating";

export const QTYPES: { value: QType; label: string; hint: string; icon: IconName }[] = [
  { value: "short_text", label: "Short text", hint: "A single line answer", icon: "fileText" },
  { value: "paragraph", label: "Paragraph", hint: "A longer free-text answer", icon: "fileText" },
  { value: "single_choice", label: "Single choice", hint: "Pick one option", icon: "check" },
  { value: "multi_choice", label: "Multiple choice", hint: "Pick any that apply", icon: "check" },
  { value: "rating", label: "Rating (1–5)", hint: "Rate from 1 to 5", icon: "award" },
];

export function qtypeLabel(t: string): string {
  return QTYPES.find((q) => q.value === t)?.label ?? t;
}

export function isChoice(t: string): boolean {
  return t === "single_choice" || t === "multi_choice";
}
