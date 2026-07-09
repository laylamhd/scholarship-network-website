"use client";

import { useMemo, useState, useTransition } from "react";
import { safeUrl } from "@/lib/safeUrl";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { EventItem } from "@/lib/events";
import type { ProjectCard } from "@/lib/volunteer";
import { EVENT_TYPES, eventTypeIcon, formatMode } from "@/lib/eventTypes";
import { causeIcon, statusLabel } from "@/lib/volunteerCauses";
import { quickCreateEvent } from "@/app/(app)/events/actions";
import EventRsvpButton from "@/components/EventRsvpButton";
import VolunteerButton from "@/components/VolunteerButton";
import { Icon } from "@/components/Icon";
import { colors, radius, shadow } from "@/lib/theme";

const VOL = { fg: "#0F8F6B", bg: "#E6F6F0" }; // single "volunteering" accent on the calendar

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
function timeStr(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

/* A calendar item is either an event or a (dated) volunteer project. */
type Entry =
  | { kind: "event"; ev: EventItem }
  | { kind: "project"; pr: ProjectCard };

function entryStart(en: Entry): Date {
  return en.kind === "event" ? new Date(en.ev.start_at) : new Date(`${en.pr.start_date}T00:00:00`);
}
function entryEndMs(en: Entry): number {
  if (en.kind === "event") return new Date(en.ev.end_at ?? en.ev.start_at).getTime();
  return new Date(`${en.pr.end_date ?? en.pr.start_date}T23:59:59`).getTime();
}

export default function EventsCalendar({
  events,
  projects = [],
  modes = [],
}: {
  events: EventItem[];
  projects?: ProjectCard[];
  modes?: string[];
}) {
  const [view, setView] = useState<"calendar" | "stack">("calendar");
  const today = new Date();
  const [cursor, setCursor] = useState<{ y: number; m: number }>({ y: today.getFullYear(), m: today.getMonth() });
  const [quickDate, setQuickDate] = useState<Date | null>(null);

  const entries = useMemo<Entry[]>(() => {
    const ev: Entry[] = events.map((e) => ({ kind: "event", ev: e }));
    const pr: Entry[] = projects.filter((p) => p.start_date).map((p) => ({ kind: "project", pr: p }));
    return [...ev, ...pr];
  }, [events, projects]);

  // Entries grouped by local day, for the calendar.
  const byDay = useMemo(() => {
    const map = new Map<string, Entry[]>();
    entries.forEach((en) => {
      const k = dayKey(entryStart(en));
      (map.get(k) ?? map.set(k, []).get(k)!).push(en);
    });
    map.forEach((list) => list.sort((a, b) => +entryStart(a) - +entryStart(b)));
    return map;
  }, [entries]);

  // Upcoming / past split for the stack view.
  const now = Date.now();
  const { upcoming, past } = useMemo(() => {
    const up: Entry[] = [], pa: Entry[] = [];
    entries.forEach((en) => (entryEndMs(en) >= now ? up : pa).push(en));
    up.sort((a, b) => +entryStart(a) - +entryStart(b));
    pa.sort((a, b) => +entryStart(b) - +entryStart(a));
    return { upcoming: up, past: pa };
  }, [entries, now]);

  const hasProjects = projects.some((p) => p.start_date);

  return (
    <div>
      {/* Legend + view toggle */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 12.5, fontWeight: 600, color: colors.inkMuted }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 11, height: 11, borderRadius: 3, background: colors.brand }} /> Events
          </span>
          {hasProjects && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 11, height: 11, borderRadius: 3, background: VOL.fg }} /> Volunteering
            </span>
          )}
        </div>
        <div style={{ display: "inline-flex", background: "#fff", border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.pill, padding: 3 }}>
          <ToggleBtn active={view === "calendar"} onClick={() => setView("calendar")} icon="calendar" label="Calendar" />
          <ToggleBtn active={view === "stack"} onClick={() => setView("stack")} icon="book" label="Stack" />
        </div>
      </div>

      {view === "calendar" ? (
        <MonthGrid cursor={cursor} setCursor={setCursor} byDay={byDay} today={today} onDayClick={setQuickDate} />
      ) : (
        <StackView upcoming={upcoming} past={past} />
      )}

      {quickDate && (
        <QuickCreateModal date={quickDate} modes={modes} onClose={() => setQuickDate(null)} />
      )}
    </div>
  );
}

/* ---------------- Notion-style inline quick-add ---------------- */
function QuickCreateModal({ date, modes, onClose }: { date: Date; modes: string[]; onClose: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<string>(EVENT_TYPES[0]);
  const [time, setTime] = useState("09:00");
  const [mode, setMode] = useState<string>((modes[0] as string) ?? "online");
  const [loc, setLoc] = useState("");
  const [link, setLink] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const needsLink = mode === "online" || mode === "hybrid";
  const needsLoc = mode === "in_person" || mode === "hybrid";

  const dateLabel = date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const dateStr = isoDate(date);

  function submit() {
    setError(null);
    start(async () => {
      const res = await quickCreateEvent({ title, event_type: type, date: dateStr, time, mode, location: needsLoc ? loc : "", online_link: needsLink ? link : "" });
      if (res.error) setError(res.error);
      else { onClose(); router.refresh(); }
    });
  }

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(33,45,55,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 20 }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: radius.lg, boxShadow: shadow.card, width: "100%", maxWidth: 440, minWidth: 0, padding: "22px 24px", boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: colors.ink }}>New event</div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: "none", border: 0, cursor: "pointer", color: colors.inkFaint }}><Icon name="x" size={20} /></button>
        </div>
        <div style={{ fontSize: 13, color: colors.brandDeep, fontWeight: 600, marginBottom: 16 }}>{dateLabel}</div>

        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          placeholder="Event title"
          style={{ width: "100%", padding: "11px 14px", fontSize: 15, color: colors.ink, background: "#fff", border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.md, outline: "none", marginBottom: 12 }}
        />

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 10, marginBottom: 12 }}>
          <select value={type} onChange={(e) => setType(e.target.value)} style={fieldStyle()}>
            {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={fieldStyle()} />
        </div>

        {modes.length > 0 && (
          <select value={mode} onChange={(e) => setMode(e.target.value)} style={{ ...fieldStyle(), marginBottom: 12 }}>
            {modes.map((mo) => <option key={mo} value={mo}>{formatMode(mo)}</option>)}
          </select>
        )}

        {needsLink && (
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            placeholder="Joining link (Zoom / Meet)"
            style={{ ...fieldStyle(), marginBottom: 12 }}
          />
        )}
        {needsLoc && (
          <input
            value={loc}
            onChange={(e) => setLoc(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            placeholder="Location / venue"
            style={{ ...fieldStyle(), marginBottom: 12 }}
          />
        )}

        {error && <div style={{ fontSize: 12.5, color: "#C0392B", marginBottom: 10 }}>{error}</div>}

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button type="button" onClick={submit} disabled={pending} style={{ background: colors.brand, color: "#fff", border: 0, borderRadius: radius.pill, padding: "10px 22px", fontSize: 14, fontWeight: 700, cursor: pending ? "default" : "pointer", opacity: pending ? 0.7 : 1, boxShadow: shadow.brand }}>
            {pending ? "Adding…" : "Add event"}
          </button>
          <Link href={`/events/new?date=${dateStr}`} style={{ fontSize: 13.5, color: colors.brandDeep, fontWeight: 600 }}>More options →</Link>
        </div>
      </div>
    </div>
  );
}

function fieldStyle(): React.CSSProperties {
  return { width: "100%", minWidth: 0, boxSizing: "border-box", padding: "10px 12px", fontSize: 14, color: colors.ink, background: "#fff", border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.md, outline: "none" };
}

function ToggleBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: "calendar" | "book"; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 7, border: 0, cursor: "pointer",
        background: active ? colors.brand : "transparent",
        color: active ? "#fff" : colors.inkMuted,
        borderRadius: radius.pill, padding: "8px 16px", fontSize: 13.5, fontWeight: 700,
        boxShadow: active ? shadow.brand : "none",
      }}
    >
      <Icon name={icon} size={15} /> {label}
    </button>
  );
}

/* ---------------- Month grid (classic calendar) ---------------- */
function MonthGrid({
  cursor,
  setCursor,
  byDay,
  today,
  onDayClick,
}: {
  cursor: { y: number; m: number };
  setCursor: (c: { y: number; m: number }) => void;
  byDay: Map<string, Entry[]>;
  today: Date;
  onDayClick?: (d: Date) => void;
}) {
  const { y, m } = cursor;
  const first = new Date(y, m, 1);
  const startWeekday = (first.getDay() + 6) % 7; // Monday = 0
  const gridStart = new Date(y, m, 1 - startWeekday);
  const cells = Array.from({ length: 42 }, (_, i) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));
  const todayKey = dayKey(today);

  const prev = () => setCursor(m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 });
  const next = () => setCursor(m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 });
  const goToday = () => setCursor({ y: today.getFullYear(), m: today.getMonth() });

  return (
    <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "16px 18px", borderBottom: `1px solid ${colors.border}`, flexWrap: "wrap" }}>
        <div style={{ fontSize: 19, fontWeight: 800, color: colors.ink }}>{MONTHS[m]} {y}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button type="button" onClick={goToday} style={navPill()}>Today</button>
          <button type="button" onClick={prev} aria-label="Previous month" style={navArrow()}>‹</button>
          <button type="button" onClick={next} aria-label="Next month" style={navArrow()}>›</button>
        </div>
      </div>

      {/* Grid scrolls horizontally on narrow screens so all 7 columns stay legible */}
      <div className="scr" style={{ overflowX: "auto" }}>
      <div style={{ minWidth: 560 }}>
      {/* Weekday header */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: `1px solid ${colors.border}`, background: colors.bg }}>
        {WEEKDAYS.map((w) => (
          <div key={w} style={{ padding: "9px 10px", fontSize: 11.5, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: colors.inkFaint, textAlign: "left" }}>{w}</div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
        {cells.map((d, i) => {
          const inMonth = d.getMonth() === m;
          const k = dayKey(d);
          const dayEntries = byDay.get(k) ?? [];
          const isToday = k === todayKey;
          return (
            <div
              key={i}
              className={onDayClick ? "cal-cell-int" : undefined}
              onClick={onDayClick ? () => onDayClick(new Date(d.getFullYear(), d.getMonth(), d.getDate())) : undefined}
              style={{
                position: "relative",
                minHeight: 104,
                minWidth: 0, // let long chips ellipsize instead of stretching the cell
                overflow: "hidden",
                borderRight: (i + 1) % 7 === 0 ? "none" : `1px solid ${colors.border}`,
                borderBottom: i < 35 ? `1px solid ${colors.border}` : "none",
                background: inMonth ? "#fff" : colors.bg,
                padding: "6px 6px 8px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                {onDayClick ? (
                  <span className="cal-add" style={{ color: colors.brand, display: "inline-flex" }} title="Add event"><Icon name="plus" size={15} /></span>
                ) : <span />}
                <span
                  style={{
                    fontSize: 12.5, fontWeight: 700,
                    color: isToday ? "#fff" : inMonth ? colors.ink : colors.inkFaint,
                    background: isToday ? colors.brand : "transparent",
                    width: 23, height: 23, borderRadius: 999,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  {d.getDate()}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                {dayEntries.slice(0, 3).map((en) =>
                  en.kind === "event" ? <EventChip key={`e-${en.ev.id}`} e={en.ev} /> : <ProjectChip key={`p-${en.pr.id}`} p={en.pr} />
                )}
                {dayEntries.length > 3 && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: colors.inkFaint, paddingLeft: 4 }}>+{dayEntries.length - 3} more</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      </div>
      </div>
    </div>
  );
}

// Every calendar chip is the same fixed-height block; long titles are ellipsized.
const chipBase: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 5,
  height: 20, borderRadius: 6, padding: "0 6px",
  fontSize: 11, fontWeight: 600, overflow: "hidden",
};
// The title span truncates with "…" when it doesn't fit.
const chipLabel: React.CSSProperties = {
  minWidth: 0, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
};

function EventChip({ e }: { e: EventItem }) {
  const isPast = new Date(e.end_at ?? e.start_at).getTime() < Date.now();
  const pending = e.review_status !== "approved";
  return (
    <Link
      href={`/events/${e.id}`}
      onClick={(ev) => ev.stopPropagation()}
      title={pending ? `${timeStr(e.start_at)} · ${e.title} (awaiting approval)` : `${timeStr(e.start_at)} · ${e.title}`}
      style={{
        ...chipBase,
        background: pending ? "#FBF6E9" : isPast ? colors.bg : colors.tintBlue,
        color: pending ? "#8A6D3B" : isPast ? colors.inkMuted : colors.brandDeep,
        borderLeft: pending ? "3px dashed #C9A227" : `3px solid ${isPast ? colors.borderStrong : colors.brand}`,
      }}
    >
      <span style={{ fontWeight: 700, flexShrink: 0 }}>{timeStr(e.start_at)}</span>
      <span style={chipLabel}>{e.title}</span>
    </Link>
  );
}

function ProjectChip({ p }: { p: ProjectCard }) {
  const isPast = new Date(`${p.end_date ?? p.start_date}T23:59:59`).getTime() < Date.now();
  return (
    <Link
      href={`/volunteer/${p.id}`}
      onClick={(ev) => ev.stopPropagation()}
      title={`${p.title} · volunteering`}
      style={{
        ...chipBase,
        background: isPast ? colors.bg : VOL.bg,
        color: isPast ? colors.inkMuted : VOL.fg,
        borderLeft: `3px solid ${isPast ? colors.borderStrong : VOL.fg}`,
      }}
    >
      <span style={chipLabel}>{p.title}</span>
    </Link>
  );
}

/* ---------------- Stack (agenda) view ---------------- */
function StackView({ upcoming, past }: { upcoming: Entry[]; past: Entry[] }) {
  return (
    <div>
      <h2 style={{ fontSize: 19, fontWeight: 700, color: colors.ink, margin: "0 0 14px" }}>Upcoming</h2>
      {upcoming.length === 0 ? (
        <EmptyBox>Nothing coming up right now — check back soon.</EmptyBox>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {upcoming.map((en) => <EntryRow key={en.kind === "event" ? `e-${en.ev.id}` : `p-${en.pr.id}`} en={en} />)}
        </div>
      )}

      {past.length > 0 && (
        <>
          <h2 style={{ fontSize: 19, fontWeight: 700, color: colors.ink, margin: "34px 0 14px" }}>Past</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {past.map((en) => <EntryRow key={en.kind === "event" ? `e-${en.ev.id}` : `p-${en.pr.id}`} en={en} past />)}
          </div>
        </>
      )}
    </div>
  );
}

function EntryRow({ en, past }: { en: Entry; past?: boolean }) {
  return en.kind === "event" ? <EventRow e={en.ev} past={past} /> : <ProjectRow p={en.pr} past={past} />;
}

function EmptyBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "40px", textAlign: "center", color: colors.inkFaint, fontSize: 14.5 }}>
      <div style={{ marginBottom: 14, opacity: 0.5, display: "flex", justifyContent: "center" }}><Icon name="calendar" size={38} /></div>
      {children}
    </div>
  );
}

function dateParts(iso: string) {
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString("en-GB", { day: "2-digit" }),
    month: d.toLocaleDateString("en-GB", { month: "short" }).toUpperCase(),
    time: d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    weekday: d.toLocaleDateString("en-GB", { weekday: "short" }),
  };
}

function DateChip({ iso, muted, accent }: { iso: string; muted?: boolean; accent?: string }) {
  const d = dateParts(iso);
  return (
    <div style={{ flexShrink: 0, width: 64, textAlign: "center", background: muted ? colors.bg : accent ? `${accent}1A` : colors.tintBlue, borderRadius: radius.md, padding: "10px 0", height: "fit-content" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: accent ?? colors.brandDeep, letterSpacing: ".04em" }}>{d.month}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: colors.ink, lineHeight: 1.1 }}>{d.day}</div>
      <div style={{ fontSize: 11, color: colors.inkFaint }}>{d.weekday}</div>
    </div>
  );
}

function EventRow({ e, past }: { e: EventItem; past?: boolean }) {
  const d = dateParts(e.start_at);
  return (
    <div className="entry-row" style={{ display: "flex", gap: 18, background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "18px 20px", opacity: past ? 0.92 : 1, flexWrap: "wrap" }}>
      <DateChip iso={e.start_at} muted={past} />

      {e.cover_image_url && (
        <Link href={`/events/${e.id}`} style={{ flexShrink: 0 }}>
          <div style={{ position: "relative", width: 96, height: 96, borderRadius: radius.md, overflow: "hidden", background: colors.tintBlue }}>
            <Image src={e.cover_image_url} alt={e.title} fill style={{ objectFit: "cover" }} />
          </div>
        </Link>
      )}

      <div className="entry-main" style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {e.event_type && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: colors.brandDeep, background: colors.tintBlue, padding: "3px 10px", borderRadius: radius.pill }}>
              <Icon name={eventTypeIcon(e.event_type)} size={12} /> {e.event_type}
            </span>
          )}
          <span style={{ fontSize: 11, fontWeight: 700, color: colors.inkMuted, background: colors.bg, padding: "3px 10px", borderRadius: radius.pill }}>{formatMode(e.mode)}</span>
          {e.review_status !== "approved" && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: e.review_status === "rejected" ? "#A33" : "#8A6D3B", background: e.review_status === "rejected" ? "#FDEDEC" : "#FBF6E9", padding: "3px 10px", borderRadius: radius.pill }}>
              <Icon name="clock" size={11} /> {e.review_status === "rejected" ? "Not approved" : "Pending review"}
            </span>
          )}
        </div>

        <Link href={`/events/${e.id}`} style={{ fontSize: 17.5, fontWeight: 700, color: colors.ink, display: "block", marginTop: 9, lineHeight: 1.3 }}>{e.title}</Link>

        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginTop: 8, fontSize: 13, color: colors.inkMuted }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="clock" size={14} /> {d.time}</span>
          {e.location && <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="pin" size={14} /> {e.location}</span>}
          {e.going_count > 0 && <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="users" size={14} /> {e.going_count} going</span>}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap", alignItems: "center" }}>
          {past ? (
            e.recording_url ? (
              <a href={safeUrl(e.recording_url)} target="_blank" rel="noreferrer" style={solidLink()}><Icon name="play" size={15} /> Watch recording</a>
            ) : (
              <span style={{ fontSize: 13, color: colors.inkFaint }}>Event ended</span>
            )
          ) : (
            <>
              <EventRsvpButton eventId={e.id} initialStatus={e.my_status} />
              {e.registration_link && (
                <a href={safeUrl(e.registration_link)} target="_blank" rel="noreferrer" style={ghostLink()}><Icon name="ticket" size={15} /> Register</a>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ProjectRow({ p, past }: { p: ProjectCard; past?: boolean }) {
  return (
    <div className="entry-row" style={{ display: "flex", gap: 18, background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "18px 20px", opacity: past ? 0.92 : 1, flexWrap: "wrap" }}>
      <DateChip iso={`${p.start_date}T00:00:00`} muted={past} accent={past ? undefined : VOL.fg} />

      {p.image_url && (
        <Link href={`/volunteer/${p.id}`} style={{ flexShrink: 0 }}>
          <div style={{ position: "relative", width: 96, height: 96, borderRadius: radius.md, overflow: "hidden", background: VOL.bg }}>
            <Image src={p.image_url} alt={p.title} fill style={{ objectFit: "cover" }} />
          </div>
        </Link>
      )}

      <div className="entry-main" style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: VOL.fg, background: VOL.bg, padding: "3px 10px", borderRadius: radius.pill }}>
            <Icon name="handshake" size={12} /> Volunteering
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: colors.inkMuted, background: colors.bg, padding: "3px 10px", borderRadius: radius.pill }}>
            <Icon name={causeIcon(p.cause)} size={12} /> {p.cause}
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, color: colors.inkMuted, background: colors.bg, padding: "3px 10px", borderRadius: radius.pill }}>{statusLabel(p.status)}</span>
        </div>

        <Link href={`/volunteer/${p.id}`} style={{ fontSize: 17.5, fontWeight: 700, color: colors.ink, display: "block", marginTop: 9, lineHeight: 1.3 }}>{p.title}</Link>

        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginTop: 8, fontSize: 13, color: colors.inkMuted }}>
          {p.location && <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="pin" size={14} /> {p.location}</span>}
          {p.volunteer_count > 0 && <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="handshake" size={14} /> {p.volunteer_count} volunteering</span>}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap", alignItems: "center" }}>
          {past || p.status === "completed" ? (
            <Link href={`/volunteer/${p.id}`} style={ghostLink()}><Icon name="handshake" size={15} /> View project</Link>
          ) : (
            <>
              <VolunteerButton projectId={p.id} initialJoined={p.i_volunteer} count={p.volunteer_count} />
              <Link href={`/volunteer/${p.id}`} style={{ fontSize: 13.5, color: colors.brandDeep, fontWeight: 600 }}>View project →</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function navPill(): React.CSSProperties {
  return { background: "#fff", color: colors.brandDeep, border: `1.5px solid ${colors.borderBlue}`, borderRadius: radius.pill, padding: "6px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" };
}
function navArrow(): React.CSSProperties {
  return { background: "#fff", color: colors.ink, border: `1.5px solid ${colors.borderStrong}`, borderRadius: 999, width: 32, height: 32, fontSize: 18, lineHeight: 1, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" };
}
function solidLink(): React.CSSProperties {
  return { display: "inline-flex", alignItems: "center", gap: 7, background: colors.brand, color: "#fff", borderRadius: radius.pill, padding: "9px 18px", fontSize: 13.5, fontWeight: 700, boxShadow: shadow.brand };
}
function ghostLink(): React.CSSProperties {
  return { display: "inline-flex", alignItems: "center", gap: 7, background: "#fff", color: colors.brandDeep, border: `1.5px solid ${colors.borderBlue}`, borderRadius: radius.pill, padding: "9px 18px", fontSize: 13.5, fontWeight: 700 };
}
