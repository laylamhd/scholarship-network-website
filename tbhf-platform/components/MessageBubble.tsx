"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteMessageForMe, deleteMessageForEveryone, reactToMessage } from "@/app/(app)/messages/actions";
import EmojiPicker from "@/components/EmojiPicker";
import { colors } from "@/lib/theme";

/** The classic WhatsApp quick reactions; the "+" opens the full picker. */
const REACTION_EMOJI = ["👍", "❤️", "😂", "😮", "😢", "🙏"] as const;

export type BubbleReaction = { emoji: string; count: number; mine: boolean };
export type QuotedPreview = { author: string; body: string } | null;

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

/** Curved reply arrow, revealed as you swipe a message to the right. */
function ReplyArrow({ opacity }: { opacity: number }) {
  return (
    <span
      aria-hidden
      style={{
        position: "absolute",
        insetInlineStart: -6,
        top: "50%",
        transform: "translateY(-50%)",
        width: 30,
        height: 30,
        borderRadius: 999,
        background: colors.tintBlue,
        color: colors.brandDeep,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity,
        pointerEvents: "none",
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 14 4 9l5-5" />
        <path d="M4 9h11a5 5 0 0 1 5 5v3" />
      </svg>
    </span>
  );
}

const SWIPE_TRIGGER = 52; // px dragged before a release fires a reply

export default function MessageBubble({
  conversationId,
  id,
  body,
  createdAt,
  mine,
  deletedForAll,
  readAt,
  showSeen,
  reactions,
  quoted,
  onReply,
}: {
  conversationId: string;
  id: string;
  body: string;
  createdAt: string;
  mine: boolean;
  deletedForAll: boolean;
  readAt: string | null;
  showSeen: boolean;
  reactions: BubbleReaction[];
  quoted: QuotedPreview;
  onReply: () => void;
}) {
  const [hover, setHover] = useState(false);
  const [open, setOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pending, start] = useTransition();
  const wrapRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Swipe-to-reply (touch): drag a bubble right to quote it.
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const touch = useRef<{ x: number; y: number; axis: "" | "x" | "y" }>({ x: 0, y: 0, axis: "" });

  // Close the menu on an outside click.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function run(fn: () => Promise<{ error?: string }>) {
    setOpen(false);
    setPickerOpen(false);
    start(async () => {
      const res = await fn();
      if (res.error) alert(res.error);
      else router.refresh();
    });
  }

  function triggerReply() {
    setOpen(false);
    onReply();
  }

  function onTouchStart(e: React.TouchEvent) {
    if (deletedForAll) return;
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY, axis: "" };
    setDragging(true);
  }
  function onTouchMove(e: React.TouchEvent) {
    if (!dragging) return;
    const t = e.touches[0];
    const dx = t.clientX - touch.current.x;
    const dy = t.clientY - touch.current.y;
    if (touch.current.axis === "") {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      touch.current.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }
    // Only a rightward horizontal drag pulls the bubble; vertical stays a scroll.
    if (touch.current.axis === "x" && dx > 0) setDragX(Math.min(dx, 72));
  }
  function onTouchEnd() {
    if (dragX > SWIPE_TRIGGER) triggerReply();
    setDragging(false);
    setDragX(0);
  }

  const canDeleteForEveryone = mine && !deletedForAll;

  return (
    <div
      ref={wrapRef}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); if (!open) setOpen(false); }}
      style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "82%", position: "relative", opacity: pending ? 0.5 : 1 }}
    >
      <ReplyArrow opacity={Math.min(1, dragX / SWIPE_TRIGGER)} />

      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          flexDirection: mine ? "row" : "row-reverse",
          transform: dragX ? `translateX(${dragX}px)` : undefined,
          transition: dragging ? "none" : "transform 160ms ease",
        }}
      >
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
          {/* Quoted message this one is replying to */}
          {quoted && !deletedForAll && (
            <div
              style={{
                borderInlineStart: `3px solid ${mine ? "rgba(255,255,255,.7)" : colors.brand}`,
                background: mine ? "rgba(255,255,255,.16)" : colors.bg,
                borderRadius: 6,
                padding: "5px 9px",
                marginBottom: 7,
                maxWidth: 260,
              }}
            >
              <div style={{ fontSize: 12.5, fontWeight: 700, color: mine ? "#fff" : colors.brandDeep }}>{quoted.author}</div>
              <div style={{ fontSize: 12.5, opacity: 0.85, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{quoted.body}</div>
            </div>
          )}
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
            minWidth: 200,
          }}
        >
          {/* WhatsApp-style quick reactions — same emoji toggles off, a new one
              replaces; the "+" opens the full picker for any emoji. */}
          {!deletedForAll && (
            <>
              <div style={{ display: "flex", gap: 2, padding: "4px 4px 6px", borderBottom: `1px solid ${colors.border}`, marginBottom: 4 }}>
                {REACTION_EMOJI.map((em) => {
                  const active = reactions.some((r) => r.mine && r.emoji === em);
                  return (
                    <button
                      key={em}
                      type="button"
                      aria-label={`React ${em}`}
                      onClick={() => run(() => reactToMessage(conversationId, id, em))}
                      style={emojiBtn(active)}
                    >
                      {em}
                    </button>
                  );
                })}
                <button
                  type="button"
                  aria-label="More emoji"
                  onClick={() => setPickerOpen((v) => !v)}
                  style={emojiBtn(pickerOpen)}
                >
                  +
                </button>
              </div>
              {pickerOpen && (
                <div style={{ borderBottom: `1px solid ${colors.border}`, marginBottom: 4, paddingBottom: 2 }}>
                  <EmojiPicker onPick={(em) => run(() => reactToMessage(conversationId, id, em))} />
                </div>
              )}
            </>
          )}

          {!deletedForAll && (
            <button type="button" onClick={triggerReply} style={menuItem(colors.ink)}>
              Reply
            </button>
          )}
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

      {/* Reaction badges — WhatsApp-style pills tucked under the bubble.
          Tapping one toggles/replaces my own reaction with that emoji. */}
      {reactions.length > 0 && !deletedForAll && (
        <div style={{ display: "flex", gap: 4, justifyContent: mine ? "flex-end" : "flex-start", marginTop: -6, position: "relative", zIndex: 1, paddingInline: 6 }}>
          {reactions.map((r) => (
            <button
              key={r.emoji}
              type="button"
              aria-label={`${r.emoji} ${r.count}`}
              onClick={() => run(() => reactToMessage(conversationId, id, r.emoji))}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                border: `1px solid ${r.mine ? colors.brand : colors.border}`,
                background: "#fff",
                borderRadius: 999,
                padding: "2px 7px",
                fontSize: 12.5,
                lineHeight: 1.4,
                color: colors.inkMuted,
                cursor: "pointer",
                boxShadow: "0 1px 3px rgba(0,0,0,0.10)",
              }}
            >
              <span style={{ fontSize: 13 }}>{r.emoji}</span>
              {r.count > 1 && <span style={{ fontWeight: 700 }}>{r.count}</span>}
            </button>
          ))}
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

function emojiBtn(active: boolean): React.CSSProperties {
  return {
    width: 30,
    height: 30,
    border: "none",
    borderRadius: 999,
    background: active ? colors.tintBlue : "transparent",
    fontSize: 17,
    lineHeight: 1,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: colors.inkMuted,
  };
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
