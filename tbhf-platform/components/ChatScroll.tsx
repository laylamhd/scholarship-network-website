"use client";

import { useEffect, useRef } from "react";

/**
 * Internal scroller for a conversation thread. Keeps the view pinned to the
 * newest message: jumps to the bottom on mount and whenever a message is added
 * (count changes), like WhatsApp — so the composer below stays visible and the
 * latest messages are what you see first.
 */
export default function ChatScroll({
  count,
  children,
}: {
  count: number;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: mounted.current ? "smooth" : "auto" });
    mounted.current = true;
  }, [count]);

  return (
    <div
      ref={ref}
      className="scr"
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: "12px 2px",
      }}
    >
      {children}
    </div>
  );
}
