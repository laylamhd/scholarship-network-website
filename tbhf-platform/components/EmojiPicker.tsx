"use client";

import { colors } from "@/lib/theme";

/** A compact set of common emoji for the reaction "+" picker (native emoji,
    no external library). */
const EMOJI = [
  "👍", "👎", "❤️", "🔥", "🎉", "👏", "🙌", "🙏",
  "😂", "🤣", "😅", "😊", "😍", "😘", "😎", "🤔",
  "😢", "😭", "😮", "😱", "😡", "🥳", "🤩", "😴",
  "💯", "✅", "❌", "⭐", "✨", "💡", "👀", "💪",
  "🤝", "🫶", "💖", "💙", "💚", "💛", "💜", "🧡",
  "🚀", "🎯", "🏆", "📚", "💼", "☕", "🌟", "😇",
  "🤗", "😉", "😋", "🤯", "🥰", "😌", "🫡", "👋",
];

export default function EmojiPicker({ onPick }: { onPick: (emoji: string) => void }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(8, 1fr)",
        gap: 2,
        maxHeight: 168,
        overflowY: "auto",
        padding: "2px 2px 4px",
      }}
    >
      {EMOJI.map((em) => (
        <button
          key={em}
          type="button"
          aria-label={`React ${em}`}
          onClick={() => onPick(em)}
          style={{
            width: 30,
            height: 30,
            border: "none",
            borderRadius: 8,
            background: "transparent",
            fontSize: 18,
            lineHeight: 1,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = colors.tintBlue)}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          {em}
        </button>
      ))}
    </div>
  );
}
