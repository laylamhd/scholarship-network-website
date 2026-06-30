"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { searchResearch, type ResearchSuggestion } from "@/app/(app)/research/actions";
import { researchKindIcon, researchKindColor } from "@/lib/researchKinds";
import { Icon } from "@/components/Icon";
import { colors, radius, shadow } from "@/lib/theme";

export default function ResearchSearch({ initialQuery = "" }: { initialQuery?: string }) {
  const [value, setValue] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<ResearchSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const term = value.trim();
    if (!term) { setSuggestions([]); setLoading(false); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      const res = await searchResearch(term);
      setSuggestions(res);
      setLoading(false);
      setOpen(true);
    }, 220);
    return () => clearTimeout(t);
  }, [value]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function runSearch(q: string) {
    setOpen(false);
    router.push(q.trim() ? `/research?q=${encodeURIComponent(q.trim())}` : "/research");
  }

  return (
    <div ref={boxRef} style={{ position: "relative", width: 240, maxWidth: "100%" }}>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => { if (suggestions.length) setOpen(true); }}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); runSearch(value); } }}
        placeholder="Search…"
        style={{ width: "100%", padding: "8px 14px", fontSize: 13.5, color: colors.ink, background: "#fff", border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.pill, outline: "none" }}
      />

      {open && value.trim() && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: "#fff", border: `1px solid ${colors.borderStrong}`, borderRadius: radius.md, boxShadow: shadow.card, zIndex: 30, overflow: "hidden", minWidth: 280 }}>
          {loading && suggestions.length === 0 ? (
            <div style={{ padding: "12px 14px", fontSize: 13, color: colors.inkFaint }}>Searching…</div>
          ) : suggestions.length === 0 ? (
            <div style={{ padding: "12px 14px", fontSize: 13, color: colors.inkFaint }}>No matches for “{value.trim()}”.</div>
          ) : (
            <>
              {suggestions.map((s) => {
                const accent = researchKindColor(s.kind);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => { setOpen(false); router.push(`/research/${s.id}`); }}
                    className="navitem"
                    style={{ display: "flex", alignItems: "center", gap: 11, width: "100%", border: 0, background: "transparent", textAlign: "left", padding: "10px 13px", cursor: "pointer" }}
                  >
                    <span style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 999, background: `${accent}18`, color: accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon name={researchKindIcon(s.kind)} size={16} />
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: colors.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title}</span>
                      <span style={{ display: "block", fontSize: 12, color: colors.inkFaint }}>{s.kind}{s.field ? ` · ${s.field}` : ""}</span>
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => runSearch(value)}
                className="navitem"
                style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", border: 0, borderTop: `1px solid ${colors.border}`, background: "transparent", textAlign: "left", padding: "10px 13px", cursor: "pointer", fontSize: 13, fontWeight: 600, color: colors.brandDeep }}
              >
                <Icon name="flask" size={15} /> See all results for “{value.trim()}”
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
