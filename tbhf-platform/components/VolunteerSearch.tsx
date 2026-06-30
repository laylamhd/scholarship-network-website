"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { searchProjects, type ProjectSuggestion } from "@/app/(app)/volunteer/actions";
import { causeIcon, causeColor } from "@/lib/volunteerCauses";
import { Icon } from "@/components/Icon";
import { colors, radius, shadow } from "@/lib/theme";

export default function VolunteerSearch({ initialQuery = "" }: { initialQuery?: string }) {
  const [value, setValue] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<ProjectSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const term = value.trim();
    if (!term) { setSuggestions([]); setLoading(false); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      const res = await searchProjects(term);
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
    router.push(q.trim() ? `/events?tab=volunteering&q=${encodeURIComponent(q.trim())}` : "/events?tab=volunteering");
  }

  return (
    <div ref={boxRef} style={{ position: "relative", width: "100%", maxWidth: 620 }}>
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: colors.inkFaint, pointerEvents: "none" }}>
          <Icon name="compass" size={18} />
        </span>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => { if (suggestions.length) setOpen(true); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); runSearch(value); } }}
          placeholder="Search community projects by name, cause or place…"
          style={{ width: "100%", padding: "13px 16px 13px 44px", fontSize: 14.5, color: colors.ink, background: "#fff", border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.pill, outline: "none", boxShadow: shadow.card }}
        />
      </div>

      {open && value.trim() && (
        <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0, background: "#fff", border: `1px solid ${colors.borderStrong}`, borderRadius: radius.md, boxShadow: shadow.card, zIndex: 30, overflow: "hidden" }}>
          {loading && suggestions.length === 0 ? (
            <div style={{ padding: "13px 16px", fontSize: 13.5, color: colors.inkFaint }}>Searching…</div>
          ) : suggestions.length === 0 ? (
            <div style={{ padding: "13px 16px", fontSize: 13.5, color: colors.inkFaint }}>No projects match “{value.trim()}”.</div>
          ) : (
            <>
              {suggestions.map((s) => {
                const accent = causeColor(s.cause);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => { setOpen(false); router.push(`/volunteer/${s.id}`); }}
                    className="navitem"
                    style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", border: 0, background: "transparent", textAlign: "left", padding: "11px 14px", cursor: "pointer" }}
                  >
                    <span style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 999, background: `${accent}18`, color: accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon name={causeIcon(s.cause)} size={17} />
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 14.5, fontWeight: 600, color: colors.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title}</span>
                      <span style={{ display: "block", fontSize: 12.5, color: colors.inkFaint }}>{s.cause}{s.location ? ` · ${s.location}` : ""}</span>
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => runSearch(value)}
                className="navitem"
                style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", border: 0, borderTop: `1px solid ${colors.border}`, background: "transparent", textAlign: "left", padding: "11px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600, color: colors.brandDeep }}
              >
                <Icon name="handshake" size={15} /> See all projects for “{value.trim()}”
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
