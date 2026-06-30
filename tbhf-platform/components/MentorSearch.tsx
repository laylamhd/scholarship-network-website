"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { searchMentors, type MentorSuggestion } from "@/app/(app)/mentorship/actions";
import { colors, radius, shadow } from "@/lib/theme";

function initials(name: string): string {
  const p = name.trim().split(/\s+/);
  return (p[0]?.[0] ?? "") + (p[1]?.[0] ?? "");
}

export default function MentorSearch({ initialQuery = "" }: { initialQuery?: string }) {
  const [value, setValue] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<MentorSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Debounced live suggestions as the student types.
  useEffect(() => {
    const term = value.trim();
    if (!term) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      const res = await searchMentors(term);
      setSuggestions(res);
      setLoading(false);
      setOpen(true);
    }, 220);
    return () => clearTimeout(t);
  }, [value]);

  // Close the dropdown on outside click.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function go(q: string) {
    setOpen(false);
    router.push(q.trim() ? `/mentorship?q=${encodeURIComponent(q.trim())}` : "/mentorship");
  }

  return (
    <div ref={boxRef} style={{ position: "relative", maxWidth: 460, marginBottom: 20 }}>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => { if (suggestions.length) setOpen(true); }}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); go(value); } }}
        placeholder="Search mentors by name, country, or topic…"
        style={{ width: "100%", padding: "12px 16px", fontSize: 14.5, color: colors.ink, background: "#fff", border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.pill, outline: "none" }}
      />

      {open && value.trim() && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: "#fff", border: `1px solid ${colors.borderStrong}`, borderRadius: radius.md, boxShadow: shadow.card, zIndex: 20, overflow: "hidden" }}>
          {loading && suggestions.length === 0 ? (
            <div style={{ padding: "13px 16px", fontSize: 13.5, color: colors.inkFaint }}>Searching…</div>
          ) : suggestions.length === 0 ? (
            <div style={{ padding: "13px 16px", fontSize: 13.5, color: colors.inkFaint }}>No mentors match “{value.trim()}”.</div>
          ) : (
            suggestions.map((s) => (
              <button
                key={s.mentor_id}
                type="button"
                onClick={() => go(s.full_name)}
                className="navitem"
                style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", border: 0, background: "transparent", textAlign: "left", padding: "10px 14px", cursor: "pointer" }}
              >
                {s.avatar_url ? (
                  <Image src={s.avatar_url} alt={s.full_name} width={36} height={36} style={{ width: 36, height: 36, borderRadius: 999, objectFit: "cover", flexShrink: 0 }} />
                ) : (
                  <span style={{ width: 36, height: 36, borderRadius: 999, background: colors.tintBlueDeep, color: colors.brandDeep, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, textTransform: "uppercase", flexShrink: 0 }}>
                    {initials(s.full_name)}
                  </span>
                )}
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 14.5, fontWeight: 600, color: colors.ink }}>{s.full_name}</span>
                  {(s.place || s.topics) && (
                    <span style={{ display: "block", fontSize: 12.5, color: colors.inkFaint, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {[s.place, s.topics].filter(Boolean).join(" — ")}
                    </span>
                  )}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
