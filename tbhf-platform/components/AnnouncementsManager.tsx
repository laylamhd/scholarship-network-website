"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAnnouncement, updateAnnouncement, toggleAnnouncement, deleteAnnouncement } from "@/app/(app)/admin/actions";
import { Icon } from "@/components/Icon";
import { colors, radius, shadow } from "@/lib/theme";
import type { Announcement } from "@/lib/admin";

const AUDIENCES: { value: Announcement["audience"]; label: string }[] = [
  { value: "all", label: "Everyone" },
  { value: "scholars", label: "Scholars" },
  { value: "alumni", label: "Alumni" },
];

export default function AnnouncementsManager({ items }: { items: Announcement[] }) {
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <p style={{ fontSize: 13.5, color: colors.inkFaint, margin: 0, maxWidth: 560, lineHeight: 1.5 }}>
          Post announcements to the whole network or a specific audience. Active ones show as a banner on members&apos; home pages.
        </p>
        <button type="button" onClick={() => setCreating(true)} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: colors.brand, color: "#fff", border: 0, borderRadius: radius.pill, padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: shadow.brand }}>
          <Icon name="plus" size={16} /> New announcement
        </button>
      </div>

      {items.length === 0 ? (
        <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "36px", textAlign: "center", color: colors.inkFaint, fontSize: 14 }}>
          No announcements yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map((a) => <Row key={a.id} a={a} onEdit={() => setEditing(a)} />)}
        </div>
      )}

      {(creating || editing) && (
        <Modal
          announcement={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

function Row({ a, onEdit }: { a: Announcement; onEdit: () => void }) {
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const router = useRouter();
  const audLabel = AUDIENCES.find((x) => x.value === a.audience)?.label ?? "Everyone";

  return (
    <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "16px 18px", opacity: a.is_active ? 1 : 0.62 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: colors.ink }}>{a.title}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: colors.brandDeep, background: colors.tintBlue, borderRadius: radius.pill, padding: "3px 9px" }}>{audLabel}</span>
            {!a.is_active && <span style={{ fontSize: 11, fontWeight: 700, color: colors.inkFaint, background: colors.bg, borderRadius: radius.pill, padding: "3px 9px" }}>Hidden</span>}
          </div>
          <p style={{ fontSize: 13.5, color: colors.inkMuted, margin: "7px 0 0", lineHeight: 1.5 }}>{a.body}</p>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 13, flexWrap: "wrap" }}>
        <button type="button" disabled={pending} onClick={() => start(async () => { await toggleAnnouncement(a.id, a.is_active); router.refresh(); })} style={ghost()}>
          <Icon name={a.is_active ? "x" : "check"} size={14} /> {a.is_active ? "Hide" : "Show"}
        </button>
        <button type="button" onClick={onEdit} style={ghost()}><Icon name="fileText" size={14} /> Edit</button>
        {confirm ? (
          <>
            <button type="button" disabled={pending} onClick={() => start(async () => { await deleteAnnouncement(a.id); router.refresh(); })} style={{ ...ghost(), color: "#C0392B", borderColor: "#F5C6C0", background: "#FDEDEC" }}>
              {pending ? "Deleting…" : "Confirm delete"}
            </button>
            <button type="button" onClick={() => setConfirm(false)} style={ghost()}>Cancel</button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirm(true)} style={ghost()}><Icon name="x" size={14} /> Delete</button>
        )}
      </div>
    </div>
  );
}

function Modal({ announcement, onClose }: { announcement: Announcement | null; onClose: () => void }) {
  const editing = Boolean(announcement);
  const [title, setTitle] = useState(announcement?.title ?? "");
  const [body, setBody] = useState(announcement?.body ?? "");
  const [audience, setAudience] = useState<Announcement["audience"]>(announcement?.audience ?? "all");
  const [isActive, setIsActive] = useState(announcement?.is_active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function submit() {
    setError(null);
    if (!title.trim()) { setError("A title is required."); return; }
    if (!body.trim()) { setError("A message is required."); return; }
    const fd = new FormData();
    fd.set("title", title); fd.set("body", body); fd.set("audience", audience); fd.set("is_active", String(isActive));
    start(async () => {
      const res = editing ? await updateAnnouncement(announcement!.id, null, fd) : await createAnnouncement(null, fd);
      if (res?.error) setError(res.error);
      else { onClose(); router.refresh(); }
    });
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(33,45,55,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: radius.lg, boxShadow: shadow.card, width: "100%", maxWidth: 520, padding: "24px 26px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: colors.ink }}>{editing ? "Edit announcement" : "New announcement"}</div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: "none", border: 0, cursor: "pointer", color: colors.inkFaint }}><Icon name="x" size={20} /></button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus placeholder="e.g. Annual scholars summit — save the date" style={field()} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Message</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="What do you want members to know?" style={{ ...field(), resize: "vertical", lineHeight: 1.5 }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Audience</label>
          <div style={{ display: "inline-flex", background: "#fff", border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.pill, padding: 3 }}>
            {AUDIENCES.map((x) => (
              <button key={x.value} type="button" onClick={() => setAudience(x.value)} style={{ border: 0, cursor: "pointer", borderRadius: radius.pill, padding: "7px 16px", fontSize: 13, fontWeight: 700, background: audience === x.value ? colors.brand : "transparent", color: audience === x.value ? "#fff" : colors.inkMuted }}>
                {x.label}
              </button>
            ))}
          </div>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13.5, color: colors.inkMuted, marginBottom: 18, cursor: "pointer" }}>
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} style={{ width: 16, height: 16, accentColor: colors.brand }} />
          Show on members&apos; home pages now
        </label>

        {error && <div style={{ fontSize: 12.5, color: "#C0392B", marginBottom: 12 }}>{error}</div>}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={{ background: "#fff", border: `1.5px solid ${colors.borderStrong}`, color: colors.inkMuted, borderRadius: radius.pill, padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
          <button type="button" onClick={submit} disabled={pending} style={{ background: colors.brand, color: "#fff", border: 0, borderRadius: radius.pill, padding: "10px 24px", fontSize: 14, fontWeight: 700, cursor: pending ? "default" : "pointer", opacity: pending ? 0.7 : 1, boxShadow: shadow.brand }}>
            {pending ? "Saving…" : editing ? "Save changes" : "Publish"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ghost(): React.CSSProperties {
  return { display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", color: colors.inkMuted, border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.pill, padding: "7px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" };
}
const lbl: React.CSSProperties = { display: "block", fontSize: 12.5, fontWeight: 700, color: colors.inkMuted, marginBottom: 7 };
function field(): React.CSSProperties {
  return { width: "100%", padding: "10px 12px", fontSize: 14, color: colors.ink, background: "#fff", border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.md, outline: "none" };
}
