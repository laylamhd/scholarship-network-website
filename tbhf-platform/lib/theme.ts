/**
 * Design tokens extracted from the TBHF Scholars Network prototype.
 * Keep colors/spacing consistent across all components.
 */
export const colors = {
  // Brand
  brand: "#11A6D6",
  brandDeep: "#0F8FB8",
  brandLight: "#5BC2E7",

  // Surfaces
  bg: "#F4F8FA",
  surface: "#FFFFFF",
  tintBlue: "#EAF6FB",
  tintBlueDeep: "#D6EEF7",

  // Text
  ink: "#33454F",
  inkMuted: "#5A6A72",
  inkSoft: "#7C8A92",
  inkFaint: "#9AA5AD",

  // Lines
  border: "#EAF0F3",
  borderStrong: "#E2EAEE",
  borderBlue: "#BFE5F2",

  white: "#FFFFFF",
} as const;

export const gradients = {
  hero: "linear-gradient(160deg,#11A6D6,#5BC2E7)",
  heroSide: "linear-gradient(150deg,#11A6D6,#5BC2E7)",
} as const;

export const radius = {
  sm: "10px",
  md: "12px",
  lg: "16px",
  pill: "999px",
} as const;

export const shadow = {
  card: "0 8px 22px rgba(51,69,79,.10)",
  brand: "0 6px 16px rgba(17,166,214,.26)",
  avatar: "0 4px 14px rgba(51,69,79,.12)",
} as const;
