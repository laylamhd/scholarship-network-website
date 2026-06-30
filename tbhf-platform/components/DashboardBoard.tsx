"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Icon, type IconName } from "@/components/Icon";
import { colors, radius, shadow } from "@/lib/theme";
import { saveDashboardLayout } from "@/app/(app)/dashboard-actions";

/* ------------------------------------------------------------------ */
/*  Serializable content shapes (passed from the server page).         */
/* ------------------------------------------------------------------ */

export type DashEvent = {
  id: string;
  title: string;
  start_at: string;
  event_type: string | null;
  mode: string;
  location: string | null;
};
export type DashStory = {
  id: string;
  title: string;
  category: string;
  read_minutes: number | null;
  author_name: string;
  like_count: number;
};
export type DashShowcase = {
  id: string;
  title: string;
  media_type: string;
  thumbnail_url: string | null;
  media_url: string | null;
};
export type DashOpportunity = {
  id: string;
  title: string;
  company_name: string;
  opportunity_type: string;
  is_remote: boolean;
  location: string | null;
  deadline: string | null;
};
export type DashMentorship = {
  id: string;
  counterpart_name: string;
  counterpart_avatar: string | null;
  counterpart_sub: string | null;
  role: "mentee" | "mentor";
};

export type DashboardData = {
  events: DashEvent[];
  stories: DashStory[];
  showcase: DashShowcase[];
  opportunities: DashOpportunity[];
  mentorships: DashMentorship[];
};

/* ------------------------------------------------------------------ */
/*  Layout config (persisted to the DB for cross-device sync)          */
/* ------------------------------------------------------------------ */

export type WidgetId = "events" | "stories" | "opportunities" | "showcase" | "mentorship" | "shortcuts";
export type WidgetSize = "small" | "medium" | "large";
export type WidgetConfig = {
  id: WidgetId;
  size: WidgetSize;
  view: string;
  color: string; // hex accent
  opacity: number; // card background alpha 0.3..1
};

const DEFAULT_COLOR = colors.brand;
const DEFAULT_OPACITY = 0.65; // "medium" transparency

const CATALOG: Record<WidgetId, { title: string; icon: IconName; href: string; desc: string; defaultSize: WidgetSize; defaultView: string }> = {
  events: { title: "Upcoming events", icon: "calendar", href: "/events", desc: "Next webinars, sessions & volunteering", defaultSize: "large", defaultView: "stack" },
  stories: { title: "Latest stories", icon: "fileText", href: "/stories", desc: "Fresh scholar stories", defaultSize: "medium", defaultView: "list" },
  opportunities: { title: "Opportunities", icon: "briefcase", href: "/opportunities", desc: "Internships, jobs & fellowships", defaultSize: "medium", defaultView: "list" },
  showcase: { title: "Showcase", icon: "image", href: "/showcase", desc: "Photos, videos, posters & artworks", defaultSize: "medium", defaultView: "grid" },
  mentorship: { title: "My mentorships", icon: "handshake", href: "/mentorship", desc: "Active mentors & mentees", defaultSize: "small", defaultView: "list" },
  shortcuts: { title: "Quick links", icon: "compass", href: "/", desc: "Jump anywhere on the platform", defaultSize: "large", defaultView: "grid" },
};

const VIEWS: Record<WidgetId, { key: string; label: string }[]> = {
  events: [{ key: "stack", label: "Stack" }, { key: "calendar", label: "Calendar" }],
  stories: [{ key: "list", label: "List" }, { key: "compact", label: "Compact" }],
  opportunities: [{ key: "list", label: "List" }, { key: "compact", label: "Compact" }],
  showcase: [{ key: "grid", label: "Grid" }, { key: "spotlight", label: "Spotlight" }],
  mentorship: [{ key: "list", label: "List" }, { key: "avatars", label: "Avatars" }],
  shortcuts: [{ key: "grid", label: "Grid" }, { key: "list", label: "List" }],
};

const SWATCHES = ["#11A6D6", "#0F8F6B", "#7C5CFF", "#E8A23D", "#E5544B", "#5A6A72"];

const SHORTCUTS: { label: string; href: string; icon: IconName }[] = [
  { label: "Profile", href: "/profile", icon: "user" },
  { label: "Community", href: "/community", icon: "globe" },
  { label: "Messages", href: "/messages", icon: "mail" },
  { label: "Resources", href: "/resources", icon: "book" },
  { label: "Mentorship", href: "/mentorship", icon: "handshake" },
  { label: "Research", href: "/research", icon: "flask" },
  { label: "Alumni", href: "/alumni", icon: "cap" },
  { label: "Groups", href: "/groups", icon: "users" },
];

function mk(id: WidgetId): WidgetConfig {
  return { id, size: CATALOG[id].defaultSize, view: CATALOG[id].defaultView, color: DEFAULT_COLOR, opacity: DEFAULT_OPACITY };
}
const DEFAULT_LAYOUT: WidgetConfig[] = [mk("events"), mk("stories"), mk("opportunities"), mk("shortcuts")];

function normalize(raw: WidgetConfig[] | null): WidgetConfig[] {
  if (!raw || !raw.length) return DEFAULT_LAYOUT.map((w) => ({ ...w }));
  const seen = new Set<WidgetId>();
  const out: WidgetConfig[] = [];
  for (const w of raw) {
    if (!w || !(w.id in CATALOG) || seen.has(w.id)) continue;
    seen.add(w.id);
    out.push({
      id: w.id,
      size: (["small", "medium", "large"] as WidgetSize[]).includes(w.size) ? w.size : CATALOG[w.id].defaultSize,
      view: VIEWS[w.id].some((v) => v.key === w.view) ? w.view : CATALOG[w.id].defaultView,
      color: typeof w.color === "string" ? w.color : DEFAULT_COLOR,
      opacity: typeof w.opacity === "number" ? Math.min(1, Math.max(0.3, w.opacity)) : DEFAULT_OPACITY,
    });
  }
  return out;
}

/* ------------------------------------------------------------------ */

export default function DashboardBoard({
  data,
  firstName,
  initialLayout,
}: {
  data: DashboardData;
  firstName: string;
  initialLayout: WidgetConfig[] | null;
}) {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(() => normalize(initialLayout));
  const [editing, setEditing] = useState(false);
  const [openId, setOpenId] = useState<WidgetId | null>(null);
  const [status, setStatus] = useState<"" | "saving" | "saved">("");
  const [dragId, setDragId] = useState<WidgetId | null>(null);
  const dragRef = useRef<WidgetId | null>(null);
  const firstRun = useRef(true);

  // Debounced persistence to the DB whenever the layout changes.
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setStatus("saving");
    const t = setTimeout(async () => {
      const res = await saveDashboardLayout(widgets);
      setStatus(res.error ? "" : "saved");
      if (!res.error) setTimeout(() => setStatus(""), 1600);
    }, 600);
    return () => clearTimeout(t);
  }, [widgets]);

  const available = (Object.keys(CATALOG) as WidgetId[]).filter((id) => !widgets.some((w) => w.id === id));

  const add = (id: WidgetId) => setWidgets((w) => [...w, mk(id)]);
  const remove = (id: WidgetId) => setWidgets((w) => w.filter((x) => x.id !== id));
  const reset = () => setWidgets(DEFAULT_LAYOUT.map((w) => ({ ...w })));
  const patch = (id: WidgetId, p: Partial<WidgetConfig>) =>
    setWidgets((w) => w.map((x) => (x.id === id ? { ...x, ...p } : x)));

  // Pointer-based drag-to-reorder (more reliable than HTML5 DnD, and reorders
  // live so the user sees the new position before releasing).
  function moveOver(target: WidgetId) {
    const from = dragRef.current;
    if (!from || from === target) return;
    setWidgets((w) => {
      const fi = w.findIndex((x) => x.id === from);
      const ti = w.findIndex((x) => x.id === target);
      if (fi < 0 || ti < 0 || fi === ti) return w;
      const next = [...w];
      const [moved] = next.splice(fi, 1);
      next.splice(ti, 0, moved);
      return next;
    });
  }

  function onPointerDown(e: React.PointerEvent, id: WidgetId) {
    if (!editing || openId === id) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    dragRef.current = id;
    setDragId(id);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    e.preventDefault();
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const card = el?.closest<HTMLElement>("[data-widget-id]");
    const overId = card?.dataset.widgetId as WidgetId | undefined;
    if (overId) moveOver(overId);
  }

  function endDrag() {
    dragRef.current = null;
    setDragId(null);
  }

  return (
    <div>
      <style>{BOARD_CSS}</style>

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: editing ? "space-between" : "flex-end", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        {editing && <div style={{ fontSize: 18, fontWeight: 700, color: colors.ink }}>Customize your dashboard</div>}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {status && <span style={{ fontSize: 12.5, color: colors.inkFaint, fontWeight: 600 }}>{status === "saving" ? "Saving…" : "Saved"}</span>}
          {editing && <button onClick={reset} style={ghostBtn}>Reset</button>}
          <button
            onClick={() => { setEditing((v) => !v); setOpenId(null); }}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: editing ? colors.brand : "#fff",
              color: editing ? "#fff" : colors.ink,
              border: `1.5px solid ${editing ? colors.brand : colors.borderStrong}`,
              borderRadius: radius.pill, padding: "9px 18px", fontSize: 13.5, fontWeight: 700, cursor: "pointer",
              boxShadow: editing ? shadow.brand : "none",
            }}
          >
            <Icon name={editing ? "check" : "sparkle"} size={15} />
            {editing ? "Done" : "Customize"}
          </button>
        </div>
      </div>

      {/* Widget gallery */}
      {editing && (
        <div style={{ background: colors.tintBlue, border: `1px solid ${colors.borderBlue}`, borderRadius: radius.lg, padding: "16px 18px", marginBottom: 20 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: colors.brandDeep, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.4 }}>Add a widget</div>
          {available.length === 0 ? (
            <div style={{ fontSize: 13.5, color: colors.inkMuted }}>Every widget is on your dashboard. Drag cards to reorder, or tap the gear to restyle one.</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
              {available.map((id) => {
                const c = CATALOG[id];
                return (
                  <button key={id} onClick={() => add(id)} style={{ display: "flex", alignItems: "flex-start", gap: 11, background: "#fff", border: `1px solid ${colors.borderStrong}`, borderRadius: radius.md, padding: "12px 13px", textAlign: "left", cursor: "pointer" }}>
                    <span style={chip(DEFAULT_COLOR)}><Icon name={c.icon} size={18} /></span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: colors.ink }}>{c.title}</span>
                      <span style={{ display: "block", fontSize: 12, color: colors.inkFaint, marginTop: 2, lineHeight: 1.4 }}>{c.desc}</span>
                    </span>
                    <span style={{ color: colors.brand, flexShrink: 0 }}><Icon name="plus" size={17} /></span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Board */}
      {widgets.length === 0 ? (
        <div style={{ background: "#fff", border: `1px dashed ${colors.borderStrong}`, borderRadius: radius.lg, padding: "40px 24px", textAlign: "center", color: colors.inkMuted }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: colors.ink, marginBottom: 4 }}>Your dashboard is empty</div>
          <div style={{ fontSize: 13.5 }}>Tap <strong>Customize</strong> to add widgets.</div>
        </div>
      ) : (
        <div className="tbhf-board">
          {widgets.map((cfg) => {
            const isOpen = editing && openId === cfg.id;
            const dragging = dragId === cfg.id;
            const canDrag = editing && !isOpen;
            return (
              <div
                key={cfg.id}
                data-widget-id={cfg.id}
                className={`w-${cfg.size}`}
                onPointerDown={(e) => onPointerDown(e, cfg.id)}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                style={{
                  position: "relative",
                  touchAction: canDrag ? "none" : undefined,
                  cursor: canDrag ? (dragging ? "grabbing" : "grab") : "default",
                  zIndex: dragging ? 20 : undefined,
                  transform: dragging ? "scale(1.03)" : undefined,
                  filter: dragging ? "drop-shadow(0 14px 26px rgba(51,69,79,.22))" : undefined,
                  transition: dragging ? "none" : "transform .14s ease",
                  animation: canDrag && !dragging ? "tbhfJiggle .35s ease-in-out infinite" : "none",
                }}
              >
                {editing && (
                  <>
                    <button onPointerDown={(e) => e.stopPropagation()} onClick={() => remove(cfg.id)} aria-label="Remove widget" style={badge("#E5544B", -8, "left")}><Icon name="x" size={13} /></button>
                    <button onPointerDown={(e) => e.stopPropagation()} onClick={() => setOpenId((o) => (o === cfg.id ? null : cfg.id))} aria-label="Widget settings" style={badge(isOpen ? colors.brand : "#33454F", -8, "right")}><Icon name="sparkle" size={12} /></button>
                  </>
                )}
                {isOpen ? (
                  // Live preview of the widget + the controls beneath it, so size,
                  // view, colour and transparency changes are visible immediately.
                  <div>
                    <Widget cfg={cfg} data={data} interactive={false} firstName={firstName} />
                    <SettingsPanel cfg={cfg} onPatch={(p) => patch(cfg.id, p)} onDone={() => setOpenId(null)} />
                  </div>
                ) : (
                  // While editing (not open), content is inert so the whole card
                  // is one clean drag surface.
                  <div style={{ pointerEvents: editing ? "none" : undefined }}>
                    <Widget cfg={cfg} data={data} interactive={!editing} firstName={firstName} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Per-widget settings tray (sits under the live preview while editing) */
/* ------------------------------------------------------------------ */

function SettingsPanel({ cfg, onPatch, onDone }: { cfg: WidgetConfig; onPatch: (p: Partial<WidgetConfig>) => void; onDone: () => void }) {
  const sliderVal = Math.round(((1 - cfg.opacity) / 0.7) * 100);
  // Stop drag-from-card pointer handling so sliders/swatches work normally.
  const stop = (e: React.PointerEvent) => e.stopPropagation();
  return (
    <div onPointerDown={stop} onPointerMove={stop} style={{ background: "#fff", border: `1px solid ${colors.brand}`, borderRadius: radius.lg, padding: "14px 16px", marginTop: 10, boxShadow: shadow.card }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: colors.brandDeep, textTransform: "uppercase", letterSpacing: 0.4 }}>Live preview · edit</span>
        <button onClick={onDone} style={{ ...ghostBtn, color: colors.brand, padding: "4px 6px" }}>Done</button>
      </div>

      <Field label="Size">
        <Segmented options={[{ k: "small", l: "S" }, { k: "medium", l: "M" }, { k: "large", l: "L" }]} value={cfg.size} onChange={(k) => onPatch({ size: k as WidgetSize })} accent={cfg.color} />
      </Field>

      <Field label="View">
        <Segmented options={VIEWS[cfg.id].map((v) => ({ k: v.key, l: v.label }))} value={cfg.view} onChange={(k) => onPatch({ view: k })} accent={cfg.color} />
      </Field>

      <Field label="Colour">
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {SWATCHES.map((s) => (
            <button key={s} onClick={() => onPatch({ color: s })} aria-label={`Colour ${s}`} style={{ width: 24, height: 24, borderRadius: 999, background: s, border: cfg.color.toLowerCase() === s.toLowerCase() ? `2.5px solid ${colors.ink}` : "2px solid #fff", boxShadow: "0 0 0 1px rgba(0,0,0,.08)", cursor: "pointer" }} />
          ))}
          <label style={{ width: 26, height: 26, borderRadius: 999, border: `1.5px dashed ${colors.borderStrong}`, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: colors.inkFaint, position: "relative" }}>
            <Icon name="palette" size={14} />
            <input type="color" value={cfg.color} onChange={(e) => onPatch({ color: e.target.value })} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} />
          </label>
        </div>
      </Field>

      <Field label="Transparency">
        <input type="range" min={0} max={100} value={sliderVal} onChange={(e) => onPatch({ opacity: +(1 - (Number(e.target.value) / 100) * 0.7).toFixed(2) })} style={{ width: "100%", accentColor: cfg.color }} />
      </Field>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 13 }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: colors.inkFaint, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function Segmented({ options, value, onChange, accent }: { options: { k: string; l: string }[]; value: string; onChange: (k: string) => void; accent: string }) {
  return (
    <div style={{ display: "inline-flex", background: colors.bg, borderRadius: radius.pill, padding: 3, gap: 2 }}>
      {options.map((o) => {
        const on = o.k === value;
        return (
          <button key={o.k} onClick={() => onChange(o.k)} style={{ border: 0, borderRadius: radius.pill, padding: "6px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", background: on ? accent : "transparent", color: on ? "#fff" : colors.inkMuted }}>{o.l}</button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Widget shell + renderers                                           */
/* ------------------------------------------------------------------ */

function Widget({ cfg, data, interactive, firstName }: { cfg: WidgetConfig; data: DashboardData; interactive: boolean; firstName: string }) {
  const c = CATALOG[cfg.id];
  const accent = cfg.color;
  return (
    <section
      className={interactive ? "card" : ""}
      style={{ background: `rgba(255,255,255,${cfg.opacity})`, backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "18px 20px", height: "100%" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 14 }}>
        <span style={chip(accent)}><Icon name={c.icon} size={18} /></span>
        <span style={{ fontSize: 15.5, fontWeight: 700, color: colors.ink, flex: 1 }}>{c.title}</span>
        {interactive && (
          <Link href={c.href} style={{ fontSize: 12.5, fontWeight: 700, color: accent, display: "inline-flex", alignItems: "center", gap: 3 }}>
            See all <Icon name="externalLink" size={12} />
          </Link>
        )}
      </div>
      <Body cfg={cfg} data={data} interactive={interactive} firstName={firstName} accent={accent} />
    </section>
  );
}

function Body({ cfg, data, interactive, firstName, accent }: { cfg: WidgetConfig; data: DashboardData; interactive: boolean; firstName: string; accent: string }) {
  switch (cfg.id) {
    case "events":
      return cfg.view === "calendar" ? <EventsCalendar items={data.events} interactive={interactive} accent={accent} /> : <EventsStack items={data.events} interactive={interactive} accent={accent} />;
    case "stories":
      return <StoriesBody items={data.stories} interactive={interactive} compact={cfg.view === "compact"} accent={accent} />;
    case "opportunities":
      return <OpportunitiesBody items={data.opportunities} interactive={interactive} compact={cfg.view === "compact"} accent={accent} />;
    case "showcase":
      return cfg.view === "spotlight" ? <ShowcaseSpotlight items={data.showcase} interactive={interactive} /> : <ShowcaseGrid items={data.showcase} interactive={interactive} />;
    case "mentorship":
      return <MentorshipBody items={data.mentorships} interactive={interactive} firstName={firstName} avatars={cfg.view === "avatars"} accent={accent} />;
    case "shortcuts":
      return cfg.view === "list" ? <ShortcutsList interactive={interactive} accent={accent} /> : <ShortcutsGrid interactive={interactive} accent={accent} />;
  }
}

function Empty({ text }: { text: string }) {
  return <div style={{ fontSize: 13, color: colors.inkFaint, padding: "8px 0" }}>{text}</div>;
}

function RowLink({ href, interactive, children }: { href: string; interactive: boolean; children: React.ReactNode }) {
  const inner = <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 0", borderTop: `1px solid ${colors.border}` }}>{children}</div>;
  return interactive ? <Link href={href} className="rowlink">{inner}</Link> : inner;
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/* --- events --- */
function EventsStack({ items, interactive, accent }: { items: DashEvent[]; interactive: boolean; accent: string }) {
  if (!items.length) return <Empty text="No upcoming events yet." />;
  return (
    <div>
      {items.slice(0, 4).map((e) => (
        <RowLink key={e.id} href={`/events/${e.id}`} interactive={interactive}>
          <span style={{ width: 42, flexShrink: 0, textAlign: "center" }}>
            <span style={{ display: "block", fontSize: 11, fontWeight: 700, color: accent, textTransform: "uppercase" }}>{new Date(e.start_at).toLocaleDateString(undefined, { month: "short" })}</span>
            <span style={{ display: "block", fontSize: 18, fontWeight: 800, color: colors.ink, lineHeight: 1 }}>{new Date(e.start_at).getDate()}</span>
          </span>
          <span style={{ minWidth: 0, flex: 1 }}>
            <span style={ellip(14, 700)}>{e.title}</span>
            <span style={{ display: "block", fontSize: 12, color: colors.inkFaint, marginTop: 2 }}>{e.event_type || "Event"}{e.location ? ` · ${e.location}` : e.mode === "online" ? " · Online" : ""}</span>
          </span>
        </RowLink>
      ))}
    </div>
  );
}

function EventsCalendar({ items, interactive, accent }: { items: DashEvent[]; interactive: boolean; accent: string }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const byDay = new Map<number, DashEvent>();
  items.forEach((e) => {
    const d = new Date(e.start_at);
    if (d.getFullYear() === year && d.getMonth() === month) byDay.set(d.getDate(), e);
  });
  const cells: (number | null)[] = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);

  const grid = (
    <>
      <div style={{ fontSize: 13, fontWeight: 700, color: colors.ink, marginBottom: 8 }}>{now.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, textAlign: "center" }}>
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} style={{ fontSize: 10, fontWeight: 700, color: colors.inkFaint, paddingBottom: 2 }}>{d}</div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const ev = byDay.get(d);
          const isToday = d === now.getDate();
          return (
            <div key={i} style={{ aspectRatio: "1 / 1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11.5, fontWeight: ev || isToday ? 700 : 500, borderRadius: 8, background: ev ? accent : isToday ? colors.bg : "transparent", color: ev ? "#fff" : colors.ink, position: "relative" }} title={ev?.title}>
              {d}
              {isToday && !ev && <span style={{ position: "absolute", bottom: 3, width: 4, height: 4, borderRadius: 999, background: accent }} />}
            </div>
          );
        })}
      </div>
    </>
  );
  return interactive ? <Link href="/events" style={{ display: "block", color: "inherit" }}>{grid}</Link> : grid;
}

/* --- stories --- */
function StoriesBody({ items, interactive, compact, accent }: { items: DashStory[]; interactive: boolean; compact: boolean; accent: string }) {
  if (!items.length) return <Empty text="No stories published yet." />;
  return (
    <div>
      {items.slice(0, compact ? 6 : 4).map((s) => (
        <RowLink key={s.id} href={`/stories/${s.id}`} interactive={interactive}>
          <span style={{ minWidth: 0, flex: 1 }}>
            <span style={ellip(14, 700)}>{s.title}</span>
            {!compact && <span style={{ display: "block", fontSize: 12, color: colors.inkFaint, marginTop: 2 }}>{s.category} · {s.author_name}{s.read_minutes ? ` · ${s.read_minutes} min` : ""}</span>}
            {compact && <span style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: accent, marginTop: 1 }}>{s.category}</span>}
          </span>
          {!compact && s.like_count > 0 && (
            <span style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 3, fontSize: 12, fontWeight: 700, color: colors.inkFaint }}><Icon name="heart" size={13} /> {s.like_count}</span>
          )}
        </RowLink>
      ))}
    </div>
  );
}

/* --- opportunities --- */
function OpportunitiesBody({ items, interactive, compact, accent }: { items: DashOpportunity[]; interactive: boolean; compact: boolean; accent: string }) {
  if (!items.length) return <Empty text="No opportunities posted yet." />;
  return (
    <div>
      {items.slice(0, compact ? 6 : 4).map((o) => (
        <RowLink key={o.id} href="/opportunities" interactive={interactive}>
          <span style={{ minWidth: 0, flex: 1 }}>
            <span style={ellip(14, 700)}>{o.title}</span>
            {!compact && <span style={{ display: "block", fontSize: 12, color: colors.inkFaint, marginTop: 2 }}>{o.company_name} · {o.opportunity_type}{o.is_remote ? " · Remote" : o.location ? ` · ${o.location}` : ""}</span>}
          </span>
          {compact ? (
            <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: accent }}>{o.opportunity_type}</span>
          ) : o.deadline ? (
            <span style={{ flexShrink: 0, fontSize: 11.5, fontWeight: 700, color: accent, background: hexA(accent, 0.12), borderRadius: radius.pill, padding: "3px 9px" }}>{shortDate(o.deadline)}</span>
          ) : null}
        </RowLink>
      ))}
    </div>
  );
}

/* --- showcase --- */
function ShowcaseGrid({ items, interactive }: { items: DashShowcase[]; interactive: boolean }) {
  if (!items.length) return <Empty text="Nothing in the showcase yet." />;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(74px, 1fr))", gap: 8 }}>
      {items.slice(0, 9).map((it) => <Thumb key={it.id} it={it} interactive={interactive} />)}
    </div>
  );
}

function ShowcaseSpotlight({ items, interactive }: { items: DashShowcase[]; interactive: boolean }) {
  if (!items.length) return <Empty text="Nothing in the showcase yet." />;
  const [hero, ...rest] = items;
  const src = hero.thumbnail_url || hero.media_url;
  const heroEl = (
    <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", borderRadius: radius.md, overflow: "hidden", background: colors.tintBlue }}>
      {src ? <Image src={src} alt={hero.title} fill sizes="400px" style={{ objectFit: "cover" }} /> : <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: colors.brandDeep }}><Icon name={hero.media_type === "video" ? "play" : "image"} size={26} /></span>}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "18px 12px 8px", background: "linear-gradient(transparent,rgba(0,0,0,.6))" }}>
        <span style={{ ...ellip(13.5, 700), color: "#fff" }}>{hero.title}</span>
      </div>
    </div>
  );
  return (
    <div>
      {interactive ? <Link href={`/showcase/${hero.id}`}>{heroEl}</Link> : heroEl}
      {rest.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(60px, 1fr))", gap: 7, marginTop: 8 }}>
          {rest.slice(0, 4).map((it) => <Thumb key={it.id} it={it} interactive={interactive} />)}
        </div>
      )}
    </div>
  );
}

function Thumb({ it, interactive }: { it: DashShowcase; interactive: boolean }) {
  const src = it.thumbnail_url || it.media_url;
  const inner = (
    <div style={{ position: "relative", aspectRatio: "1 / 1", borderRadius: radius.sm, overflow: "hidden", background: colors.tintBlue }}>
      {src ? <Image src={src} alt={it.title} fill sizes="90px" style={{ objectFit: "cover" }} /> : <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: colors.brandDeep }}><Icon name={it.media_type === "video" ? "play" : "image"} size={18} /></span>}
    </div>
  );
  return interactive ? <Link href={`/showcase/${it.id}`}>{inner}</Link> : <div>{inner}</div>;
}

/* --- mentorship --- */
function MentorshipBody({ items, interactive, firstName, avatars, accent }: { items: DashMentorship[]; interactive: boolean; firstName: string; avatars: boolean; accent: string }) {
  if (!items.length) {
    return (
      <div style={{ fontSize: 13, color: colors.inkMuted, lineHeight: 1.5 }}>
        No active mentorships yet, {firstName}.{" "}
        {interactive && <Link href="/mentorship" style={{ color: accent, fontWeight: 700 }}>Find a mentor →</Link>}
      </div>
    );
  }
  if (avatars) {
    const row = (
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        {items.slice(0, 6).map((m) => (
          <div key={m.id} style={{ width: 58, textAlign: "center" }}>
            <Avatar m={m} size={48} accent={accent} />
            <span style={{ ...ellip(11.5, 600), marginTop: 5 }}>{m.counterpart_name.split(/\s+/)[0]}</span>
          </div>
        ))}
      </div>
    );
    return interactive ? <Link href="/mentorship" style={{ color: "inherit" }}>{row}</Link> : row;
  }
  return (
    <div>
      {items.slice(0, 4).map((m) => (
        <RowLink key={m.id} href="/mentorship" interactive={interactive}>
          <Avatar m={m} size={34} accent={accent} />
          <span style={{ minWidth: 0, flex: 1 }}>
            <span style={ellip(14, 700)}>{m.counterpart_name}</span>
            <span style={{ display: "block", fontSize: 12, color: colors.inkFaint, marginTop: 1 }}>{m.role === "mentee" ? "Your mentor" : "Your mentee"}{m.counterpart_sub ? ` · ${m.counterpart_sub}` : ""}</span>
          </span>
        </RowLink>
      ))}
    </div>
  );
}

function Avatar({ m, size, accent }: { m: DashMentorship; size: number; accent: string }) {
  return m.counterpart_avatar ? (
    <Image src={m.counterpart_avatar} alt={m.counterpart_name} width={size} height={size} style={{ width: size, height: size, borderRadius: 999, objectFit: "cover", flexShrink: 0 }} />
  ) : (
    <span style={{ width: size, height: size, borderRadius: 999, background: hexA(accent, 0.16), color: accent, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.36, fontWeight: 700, flexShrink: 0 }}>{m.counterpart_name.slice(0, 1).toUpperCase()}</span>
  );
}

/* --- shortcuts --- */
function ShortcutsGrid({ interactive, accent }: { interactive: boolean; accent: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))", gap: 10 }}>
      {SHORTCUTS.map((s) => {
        const inner = (
          <div className={interactive ? "rowlink" : ""} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "10px 4px", borderRadius: radius.md, textAlign: "center" }}>
            <span style={{ width: 40, height: 40, borderRadius: 11, background: hexA(accent, 0.13), color: accent, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name={s.icon} size={19} /></span>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: colors.ink }}>{s.label}</span>
          </div>
        );
        return interactive ? <Link key={s.label} href={s.href}>{inner}</Link> : <div key={s.label}>{inner}</div>;
      })}
    </div>
  );
}

function ShortcutsList({ interactive, accent }: { interactive: boolean; accent: string }) {
  return (
    <div>
      {SHORTCUTS.map((s) => {
        const inner = (
          <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 0", borderTop: `1px solid ${colors.border}` }}>
            <span style={{ width: 32, height: 32, borderRadius: 9, background: hexA(accent, 0.13), color: accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name={s.icon} size={16} /></span>
            <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: colors.ink }}>{s.label}</span>
            <Icon name="externalLink" size={13} />
          </div>
        );
        return interactive ? <Link key={s.label} href={s.href} className="rowlink">{inner}</Link> : <div key={s.label}>{inner}</div>;
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */

const BOARD_CSS = `
@keyframes tbhfJiggle{0%{transform:rotate(-.5deg)}50%{transform:rotate(.5deg)}100%{transform:rotate(-.5deg)}}
.tbhf-board{display:grid;gap:18px;grid-template-columns:repeat(4,1fr);align-items:start}
.tbhf-board .w-small{grid-column:span 1}
.tbhf-board .w-medium{grid-column:span 2}
.tbhf-board .w-large{grid-column:span 4}
@media (max-width:1100px){.tbhf-board{grid-template-columns:repeat(2,1fr)}.tbhf-board .w-large{grid-column:span 2}}
@media (max-width:680px){.tbhf-board{grid-template-columns:1fr}.tbhf-board .w-small,.tbhf-board .w-medium,.tbhf-board .w-large{grid-column:span 1}}
`;

function chip(accent: string): React.CSSProperties {
  return { width: 38, height: 38, borderRadius: 11, background: hexA(accent, 0.14), color: accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
}

function badge(bg: string, offset: number, side: "left" | "right"): React.CSSProperties {
  return { position: "absolute", top: offset, [side]: offset, zIndex: 5, width: 26, height: 26, borderRadius: 999, background: bg, color: "#fff", border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: shadow.card } as React.CSSProperties;
}

const ghostBtn: React.CSSProperties = { background: "none", border: 0, color: colors.inkMuted, fontSize: 13, fontWeight: 700, cursor: "pointer", padding: "8px 6px" };

function ellip(size: number, weight: number): React.CSSProperties {
  return { display: "block", fontSize: size, fontWeight: weight, color: colors.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
}

function hexA(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(n.slice(0, 2), 16) || 0;
  const g = parseInt(n.slice(2, 4), 16) || 0;
  const b = parseInt(n.slice(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${a})`;
}
