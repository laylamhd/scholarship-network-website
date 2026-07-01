"use client";

// Client-safe helpers for @mentions in community posts & comments.
//
// Storage format: a mention is stored inline as a token `@[Full Name](uuid)`.
// A literal `@all` (staff broadcast) is stored as plain text and detected by
// the server. The editor works in a *readable* form (plain `@Full Name`) and
// serialises to tokens on submit via `serializeMentions`.

import Link from "next/link";
import { colors, radius } from "@/lib/theme";

export type MentionMember = { id: string; full_name: string };

// @[Name](uuid)
const TOKEN_RE = /@\[([^\]]+)\]\(([0-9a-fA-F-]{36})\)/g;
// standalone @all (broadcast)
const ALL_RE = /(^|[^A-Za-z0-9_])@all(?=[^A-Za-z0-9_]|$)/g;

function Chip({ children, href }: { children: React.ReactNode; href?: string }) {
  const style: React.CSSProperties = {
    color: colors.brandDeep,
    background: colors.tintBlue,
    fontWeight: 700,
    borderRadius: radius.pill,
    padding: "0 6px",
    whiteSpace: "nowrap",
  };
  return href ? (
    <Link href={href} style={style}>{children}</Link>
  ) : (
    <span style={style}>{children}</span>
  );
}

/** Render post/comment text with mention tokens and @all turned into chips. */
export function RichText({ text }: { text: string }) {
  const nodes: React.ReactNode[] = [];
  let key = 0;

  // First split on mention tokens, then within plain runs highlight @all.
  let last = 0;
  const src = text;
  TOKEN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  const pushPlain = (chunk: string) => {
    if (!chunk) return;
    let li = 0;
    ALL_RE.lastIndex = 0;
    let a: RegExpExecArray | null;
    while ((a = ALL_RE.exec(chunk)) !== null) {
      const start = a.index + a[1].length;
      if (start > li) nodes.push(<span key={key++}>{chunk.slice(li, start)}</span>);
      nodes.push(<Chip key={key++}>@all</Chip>);
      li = start + 4; // length of "@all"
    }
    if (li < chunk.length) nodes.push(<span key={key++}>{chunk.slice(li)}</span>);
  };

  while ((m = TOKEN_RE.exec(src)) !== null) {
    pushPlain(src.slice(last, m.index));
    nodes.push(
      <Chip key={key++} href={`/scholars/${m[2]}`}>@{m[1]}</Chip>,
    );
    last = m.index + m[0].length;
  }
  pushPlain(src.slice(last));

  return <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{nodes}</span>;
}

/** Turn stored tokens back into readable `@Full Name` text (for editing),
 *  returning the readable string plus the picks needed to re-serialise it. */
export function deserializeMentions(text: string): { text: string; picks: MentionMember[] } {
  const picks: MentionMember[] = [];
  TOKEN_RE.lastIndex = 0;
  const out = text.replace(TOKEN_RE, (_m, name: string, id: string) => {
    picks.push({ id, full_name: name });
    return `@${name}`;
  });
  return { text: out, picks };
}

/** Replace readable `@Full Name` runs with `@[Full Name](uuid)` tokens. */
export function serializeMentions(text: string, picks: MentionMember[]): string {
  if (picks.length === 0) return text;
  // Longest names first so a shorter name can't shadow a longer one.
  const ordered = [...picks].sort((a, b) => b.full_name.length - a.full_name.length);
  let out = text;
  for (const p of ordered) {
    const esc = p.full_name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Match "@Name" not already inside a token (i.e. not followed by "](")
    const re = new RegExp(`@${esc}(?!\\]\\()`, "g");
    out = out.replace(re, `@[${p.full_name}](${p.id})`);
  }
  return out;
}
