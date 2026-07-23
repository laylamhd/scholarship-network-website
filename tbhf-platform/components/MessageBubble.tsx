"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteMessageForMe, deleteMessageForEveryone } from "@/app/(app)/messages/actions";
import { colors } from "@/lib/theme";

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" });
}

/** WhatsApp-style double check — grey when sent, blue when seen. */
function Ticks({ seen }: { seen: boolean }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke={seen ? "#34A9E0" : colors.inkFaint}
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ verticalAlign: "-3px", marginInlineStart: 3 }}
      aria-label={seen ? "Seen" : "Sent"}
    >
      <path d="M2.5 12.5 7 17 15.5 8" />
      <path d="M11 15.5l1.5 1.5L21 8.5" />
    </svg>
  );
}

export default function MessageBubble({
  conversationId,
  id,
  body,
  createdAt,
  mine,
  deletedForAll,
  readAt,
  showSeen,
}: {
  conversationId: string;
  id: string;
  body: string;
  createdAt: string;
  mine: boolean;
  deletedForAll: boolean;
  readAt: string | null;
  showSeen: boolean;
}) {
  const [hover, setHover] = useState(false);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const wrapRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close the menu on an outside click.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function run(fn: () => Promise<{ error?: string }>) {
    setOpen(false);
    start(async () => {
      const res = await fn();
      if (res.error) alert(res.error);
      else router.refresh();
    });
  }

  const canDeleteForEveryone = mine && !deletedForAll;

  return (
    <div
      ref={wrapRef}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); if (!open) setOpen(false); }}
      style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "72%", position: "relative", opacity: pending ? 0.5 : 1 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexDirection: mine ? "row" : "row-reverse" }}>
        {/* Menu trigger — appears on hover */}
        <button
          type="button"
          aria-label="Message options"
          onClick={() => setOpen((v) => !v)}
          style={{
            flexShrink: 0,
            width: 26,
            height: 26,
            borderRadius: 999,
            border: "none",
            background: "transparent",
            color: colors.inkFaint,
            cursor: "pointer",
            fontSize: 16,
            lineHeight: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: hover || open ? 1 : 0,
            transition: "opacity 120ms",
          }}
        >
          ⋯
        </button>

        <div
          style={{
            background: deletedForAll ? "#fff" : mine ? colors.brand : "#fff",
            color: deletedForAll ? colors.inkFaint : mine ? "#fff" : colors.ink,
            border: deletedForAll ? `1px solid ${colors.border}` : mine ? "none" : `1px solid ${colors.border}`,
            borderRadius: 16,
            borderBottomRightRadius: mine ? 4 : 16,
            borderBottomLeftRadius: mine ? 16 : 4,
            padding: "10px 14px",
            fontSize: 14.5,
            lineHeight: 1.5,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontStyle: deletedForAll ? "italic" : "normal",
            boxShadow: deletedForAll ? "0 1px 3px rgba(0,0,0,0.10)" : "none",
          }}
        >
          {deletedForAll ? "This message was deleted" : body}
        </div>
      </div>

      {open && (
        <div
          style={{
            position: "absolute",
            top: 30,
            [mine ? "right" : "left"]: 0,
            zIndex: 20,
            background: "#fff",
            border: `1px solid ${colors.border}`,
            borderRadius: 12,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            padding: 5,
            minWidth: 176,
          }}
        >
          {canDeleteForEveryone && (
            <button
              type="button"
              onClick={() => run(() => deleteMessageForEveryone(conversationId, id))}
              style={menuItem("#C0392B")}
            >
              Delete for everyone
            </button>
          )}
          <button
            type="button"
            onClick={() => run(() => deleteMessageForMe(conversationId, id))}
            style={menuItem(colors.ink)}
          >
            Delete for me
          </button>
        </div>
      )}

      <div style={{ fontSize: 11, color: colors.inkFaint, marginTop: 3, textAlign: mine ? "right" : "left" }}>
        {fmtTime(createdAt)}
        {/* Read receipt on my own messages: blue "Seen" ticks only when both
            participants have read receipts enabled (phase36, WhatsApp-style). */}
        {mine && !deletedForAll && <Ticks seen={showSeen && !!readAt} />}
      </div>
    </div>
  );
}

function menuItem(color: string): React.CSSProperties {
  return {
    display: "block",
    width: "100%",
    textAlign: "left",
    background: "transparent",
    border: "none",
    borderRadius: 8,
    padding: "9px 12px",
    fontSize: 14,
    fontWeight: 600,
    color,
    cursor: "pointer",
  };
}
