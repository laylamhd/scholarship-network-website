"use client";

import { useEffect, useRef, useState } from "react";
import { colors, radius, shadow } from "@/lib/theme";
import type { MentionMember } from "@/lib/mentions";

type Suggestion = { id: string; label: string; sub?: string; all?: boolean };

function initials(name: string) {
  const p = name.trim().split(/\s+/);
  return (p[0]?.[0] ?? "") + (p[1]?.[0] ?? "");
}

// Find the mention being typed immediately before the caret (an "@" that
// starts a word, followed by text with no intervening "@" or newline).
function activeQuery(text: string, caret: number): { at: number; query: string } | null {
  const upto = text.slice(0, caret);
  const m = upto.match(/(^|\s)@([^@\n]*)$/);
  if (!m) return null;
  const query = m[2];
  return { at: caret - query.length - 1, query };
}

export default function MentionTextarea({
  value,
  onChange,
  members,
  allowAll = false,
  onMention,
  onSubmit,
  placeholder,
  rows = 3,
  autoFocus = false,
  compact = false,
}: {
  value: string;
  onChange: (v: string) => void;
  members: MentionMember[];
  allowAll?: boolean;
  onMention?: (m: MentionMember) => void;
  onSubmit?: () => void;
  placeholder?: string;
  rows?: number;
  autoFocus?: boolean;
  compact?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const caretToApply = useRef<number | null>(null);
  const [menu, setMenu] = useState<{ at: number; items: Suggestion[] } | null>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (caretToApply.current != null && ref.current) {
      const pos = caretToApply.current;
      caretToApply.current = null;
      ref.current.focus();
      ref.current.setSelectionRange(pos, pos);
    }
  }, [value]);

  function recompute(text: string, caret: number) {
    const q = activeQuery(text, caret);
    if (!q) { setMenu(null); return; }
    const ql = q.query.trim().toLowerCase();
    const matched = members
      .filter((m) => m.full_name.toLowerCase().includes(ql))
      .slice(0, 6)
      .map<Suggestion>((m) => ({ id: m.id, label: m.full_name }));
    const items: Suggestion[] = [];
    if (allowAll && "all".includes(ql)) {
      items.push({ id: "__all__", label: "Everyone", sub: "@all — notify every member", all: true });
    }
    items.push(...matched);
    if (items.length === 0) { setMenu(null); return; }
    setMenu({ at: q.at, items });
    setActive(0);
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const text = e.target.value;
    onChange(text);
    recompute(text, e.target.selectionStart ?? text.length);
  }

  function pick(s: Suggestion) {
    if (!menu || !ref.current) return;
    const caret = ref.current.selectionStart ?? value.length;
    const insert = s.all ? "@all " : `@${s.label} `;
    const next = value.slice(0, menu.at) + insert + value.slice(caret);
    caretToApply.current = menu.at + insert.length;
    onChange(next);
    setMenu(null);
    if (!s.all) onMention?.({ id: s.id, full_name: s.label });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (menu) {
      if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => (i + 1) % menu.items.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => (i - 1 + menu.items.length) % menu.items.length); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); pick(menu.items[active]); return; }
      if (e.key === "Escape") { e.preventDefault(); setMenu(null); return; }
    }
    if (onSubmit && e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  }

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <textarea
        ref={ref}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setMenu(null), 120)}
        placeholder={placeholder}
        rows={rows}
        autoFocus={autoFocus}
        style={
          compact
            ? { width: "100%", resize: "none", padding: "9px 13px", fontSize: 13.5, color: colors.ink, background: "#fff", border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.md, outline: "none", lineHeight: 1.5, fontFamily: "inherit" }
            : { width: "100%", resize: "vertical", border: 0, outline: "none", fontSize: 14.5, color: colors.ink, lineHeight: 1.55, fontFamily: "inherit" }
        }
      />
      {menu && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            insetInlineStart: 0,
            zIndex: 50,
            minWidth: 240,
            maxWidth: 320,
            background: "#fff",
            border: `1px solid ${colors.border}`,
            borderRadius: radius.md,
            boxShadow: shadow.card,
            overflow: "hidden",
            marginTop: 4,
          }}
        >
          {menu.items.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); pick(s); }}
              onMouseEnter={() => setActive(i)}
              style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%",
                padding: "8px 12px", border: 0, cursor: "pointer", textAlign: "start",
                background: i === active ? colors.tintBlue : "#fff",
              }}
            >
              <span style={{ width: 28, height: 28, borderRadius: 999, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, textTransform: "uppercase", background: s.all ? colors.brand : colors.tintBlueDeep, color: s.all ? "#fff" : colors.brandDeep }}>
                {s.all ? "@" : initials(s.label)}
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: colors.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.label}</span>
                {s.sub && <span style={{ display: "block", fontSize: 11.5, color: colors.inkFaint }}>{s.sub}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
