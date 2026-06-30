import type { CSSProperties } from "react";

// Shared line-icon set (brand-styled, thin rounded strokes — no emojis anywhere).
const PATHS: Record<string, React.ReactNode> = {
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-4 3.5-6 7-6s7 2 7 6" />
    </>
  ),
  users: (
    <>
      <circle cx="8" cy="9" r="2.6" />
      <circle cx="16" cy="9" r="2.6" />
      <path d="M3 19c0-2.6 2.2-4.2 5-4.2s5 1.6 5 4.2" />
      <path d="M13.5 14.9c2.6-.2 5 1.4 5 4.1" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3.5 6.5 12 13l8.5-6.5" />
    </>
  ),
  chat: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  book: (
    <>
      <path d="M4 5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      <path d="M13 3v5h5" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3" y="7.5" width="18" height="12" rx="2" />
      <path d="M8.5 7.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5" />
      <path d="M3 12.4h18" />
    </>
  ),
  building: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="1.5" />
      <path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2" />
      <path d="M10 21v-3h4v3" />
    </>
  ),
  cap: (
    <>
      <path d="M2.5 8.5 12 4.2l9.5 4.3L12 12.8z" />
      <path d="M6.2 10.6V15c0 1.5 2.6 2.7 5.8 2.7s5.8-1.2 5.8-2.7v-4.4" />
      <path d="M21.5 8.7V14" />
    </>
  ),
  flask: (
    <>
      <path d="M9 3h6M10 3v6l-4.5 8a2 2 0 0 0 1.8 3h9.4a2 2 0 0 0 1.8-3L14 9V3" />
      <path d="M7.5 15h9" />
    </>
  ),
  award: (
    <>
      <circle cx="12" cy="9" r="5" />
      <path d="M9 13.5 7.5 21 12 18.5 16.5 21 15 13.5" />
    </>
  ),
  heart: <path d="M12 20.4 4.3 12.6a4.6 4.6 0 0 1 6.5-6.5l1.2 1.2 1.2-1.2a4.6 4.6 0 0 1 6.5 6.5z" />,
  handshake: (
    <>
      <path d="M11 6 8.5 4.5a2 2 0 0 0-2 .1L2.5 7.5v6l2 2" />
      <path d="M13 6l2.5-1.5a2 2 0 0 1 2 .1l4 2.9v6l-2 2" />
      <path d="M11 6c-1 0-1.8.4-2.5 1.2L6 10c-.7.8-.6 1.9.2 2.5.7.5 1.6.4 2.2-.2L11 9.5" />
      <path d="m11 9.5 2.5 2.4c.7.7 1.8.7 2.5 0l.4-.4M13.5 11.9l1.6 1.6c.7.7 1.7.7 2.3 0M15.1 13.5l1 1c.6.6 1.5.6 2 0" />
    </>
  ),
  x: <path d="M6 6l12 12M18 6 6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  database: (
    <>
      <ellipse cx="12" cy="5.5" rx="7.5" ry="3" />
      <path d="M4.5 5.5v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6" />
      <path d="M4.5 11.5v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6" />
    </>
  ),
  bulb: (
    <>
      <path d="M9 17.5h6M10 20.5h4" />
      <path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1.1 2h5c.1-.8.5-1.5 1.1-2A6 6 0 0 0 12 3z" />
    </>
  ),
  link: (
    <>
      <path d="M9.5 14.5 14.5 9.5" />
      <path d="M8 11 6.5 12.5a3.5 3.5 0 0 0 5 5L13 16" />
      <path d="M16 13l1.5-1.5a3.5 3.5 0 0 0-5-5L11 8" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.6" />
      <path d="M21 16l-5-5L5 20" />
    </>
  ),
  play: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 8.5 16 12l-6 3.5z" fill="currentColor" stroke="none" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-1 2-2 0-1.3-1-1.7-1-3 0-.8.7-1.5 1.6-1.5H17a4 4 0 0 0 4-4c0-4-4-7.5-9-7.5z" />
      <circle cx="7.5" cy="11" r="1" fill="currentColor" stroke="none" />
      <circle cx="10.5" cy="7.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="7.5" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  slides: (
    <>
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M12 17v3M9 20h6" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="16" rx="2" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    </>
  ),
  ticket: (
    <>
      <path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4z" />
      <path d="M14 6v2M14 11v2M14 16v0" />
    </>
  ),
  fileText: (
    <>
      <path d="M6 3h8l4 4v14a0 0 0 0 1 0 0H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M14 3v4h4M8.5 12h7M8.5 15.5h7M8.5 8.5h3" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5 13.5 13.5 8.5 15.5 10.5 10.5z" />
    </>
  ),
  mic: (
    <>
      <rect x="9.5" y="3" width="5" height="11" rx="2.5" />
      <path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" />
    </>
  ),
  monitor: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M9 20h6M12 16v4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  bookmark: <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" />,
  check: <path d="M5 12.5 10 17.5 19.5 7" />,
  pin: (
    <>
      <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  sparkle: (
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
  ),
  externalLink: (
    <>
      <path d="M14 4h6v6" />
      <path d="M20 4 11 13" />
      <path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
    </>
  ),
  clipboard: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <rect x="9" y="2.5" width="6" height="3.5" rx="1" />
      <path d="M9 11h6M9 15h4" />
    </>
  ),
  barChart: (
    <>
      <path d="M5 21V11M12 21V4M19 21v-6" />
      <path d="M3.5 21h17" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l7 3v5c0 4.4-2.9 8.3-7 9.6C7.9 19.3 5 15.4 5 11V6z" />
      <path d="M9.3 11.8l1.9 1.9 3.6-4" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 8h10M18 8h2M4 16h2M10 16h10" />
      <circle cx="16" cy="8" r="2" />
      <circle cx="8" cy="16" r="2" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 12c0-.5 0-1-.1-1.5l2-1.6-2-3.4-2.4 1a7.3 7.3 0 0 0-2.6-1.5L13.9 2h-3.8l-.4 2.5A7.3 7.3 0 0 0 7.1 6L4.7 5l-2 3.4 2 1.6c-.1.5-.1 1-.1 1.5s0 1 .1 1.5l-2 1.6 2 3.4 2.4-1c.8.6 1.6 1.1 2.6 1.5l.4 2.5h3.8l.4-2.5c1-.4 1.8-.9 2.6-1.5l2.4 1 2-3.4-2-1.6c.1-.5.1-1 .1-1.5z" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </>
  ),
  lock: (
    <>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
    </>
  ),
  logout: (
    <>
      <path d="M16 17l5-5-5-5M21 12H9M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    </>
  ),
};

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  size = 22,
  stroke = 1.8,
  fill = "none",
  style,
}: {
  name: IconName;
  size?: number;
  stroke?: number;
  fill?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      aria-hidden="true"
    >
      {PATHS[name] ?? null}
    </svg>
  );
}
