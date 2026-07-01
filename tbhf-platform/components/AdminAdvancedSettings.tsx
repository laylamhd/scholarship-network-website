"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon, type IconName } from "@/components/Icon";
import { setModerator, revokeModerator, setMemberRole, searchMembers } from "@/app/(app)/admin/actions";
import { MODERATOR_CAPS, capLabel, type Moderator } from "@/lib/moderators";
import { colors, radius, shadow } from "@/lib/theme";
import type { AdminMember } from "@/lib/admin";

/**
 * Admin "Advanced settings" tab: assign moderators (scholars/alumni who help
 * run the platform with a chosen subset of capabilities) and promote/step-down
 * other admins. All writes go through admin-gated server actions / RPCs.
 */
export default function AdminAdvancedSettings({
  members, moderators, currentUserId,
}: {
  members: AdminMember[];
  moderators: Moderator[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Member picker overlay — opened for either flow.
  const [picker, setPicker] = useState<null | "moderator" | "admin">(null);
  // Capability editor overlay (new grant or editing an existing moderator).
  const [editor, setEditor] = useState<null | { id: string; name: string; email: string; caps: string[]; isNew: boolean }>(null);

  const modIds = useMemo(() => new Set(moderators.map((m) => m.profile_id)), [moderators]);
  const admins = useMemo(() => members.filter((m) => m.role === "admin"), [members]);

  // Eligible members for each flow.
  const eligibleForMod = useMemo(
    () => members.filter((m) => (m.role === "scholar" || m.role === "alumni") && !modIds.has(m.id)),
    [members, modIds],
  );
  const eligibleForAdmin = useMemo(() => members.filter((m) => m.role !== "admin"), [members]);

  function run(fn: () => Promise<{ error?: string }>, onDone?: () => void) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (res.error) setError(res.error);
      else { onDone?.(); router.refresh(); }
    });
  }

  function pickMember(m: AdminMember) {
    if (picker === "moderator") {
      setEditor({ id: m.id, name: m.full_name || "Unnamed", email: m.email, caps: [], isNew: true });
      setPicker(null);
    } else if (picker === "admin") {
      setPicker(null);
      run(() => setMemberRole(m.id, "admin"));
    }
  }

  function saveModerator() {
    if (!editor) return;
    const caps = editor.caps;
    run(() => setModerator(editor.id, caps), () => setEditor(null));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 30, maxWidth: 940 }}>
      {error && (
        <div style={{ background: "#FDECEA", border: "1px solid #F5B7B1", color: "#A93226", borderRadius: radius.md, padding: "11px 15px", fontSize: 13.5, fontWeight: 600 }}>
          {error}
        </div>
      )}

      {/* ---------------- Moderators ---------------- */}
      <section>
        <SectionHead
          icon="shield"
          title="Moderators"
          blurb="Give a scholar or alumnus a helping-hand role. You choose exactly what each moderator can access and manage. They always have fewer privileges than an admin."
          action={<AddButton label="Assign moderator" onClick={() => { setError(null); setPicker("moderator"); }} disabled={pending} />}
        />

        {moderators.length === 0 ? (
          <EmptyBox>No moderators yet. Assign one to share the day-to-day workload.</EmptyBox>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
            {moderators.map((m) => (
              <div key={m.profile_id} style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "16px 18px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <Avatar name={m.full_name} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 700, color: colors.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.full_name || "Unnamed"}</div>
                    <div style={{ fontSize: 12, color: colors.inkFaint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.email}</div>
                    <span style={{ display: "inline-block", marginTop: 5, fontSize: 11, fontWeight: 700, color: colors.brandDeep, background: colors.tintBlue, borderRadius: radius.pill, padding: "2px 9px", textTransform: "capitalize" }}>{m.role}</span>
                  </div>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "13px 0 14px" }}>
                  {m.capabilities.length === 0 ? (
                    <span style={{ fontSize: 12.5, color: colors.inkFaint }}>No capabilities granted.</span>
                  ) : (
                    m.capabilities.map((c) => (
                      <span key={c} style={{ fontSize: 11.5, fontWeight: 600, color: colors.inkMuted, background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: radius.pill, padding: "3px 10px" }}>{capLabel(c)}</span>
                    ))
                  )}
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" disabled={pending}
                    onClick={() => { setError(null); setEditor({ id: m.profile_id, name: m.full_name || "Unnamed", email: m.email, caps: [...m.capabilities], isNew: false }); }}
                    style={ghostBtn}>
                    <Icon name="sparkle" size={14} /> Edit capabilities
                  </button>
                  <button type="button" disabled={pending}
                    onClick={() => { if (confirm(`Remove ${m.full_name || "this member"} as a moderator?`)) run(() => revokeModerator(m.profile_id)); }}
                    style={dangerBtn}>
                    <Icon name="x" size={14} /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ---------------- Administrators ---------------- */}
      <section>
        <SectionHead
          icon="award"
          title="Administrators"
          blurb="Admins have full access to every area of the platform. Promote a trusted member, or step an admin back down to a scholar account."
          action={<AddButton label="Assign admin" onClick={() => { setError(null); setPicker("admin"); }} disabled={pending} />}
        />

        <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, overflow: "hidden" }}>
          {admins.length === 0 ? (
            <EmptyBox>No administrators found.</EmptyBox>
          ) : (
            admins.map((a) => {
              const isSelf = a.id === currentUserId;
              return (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", borderTop: `1px solid ${colors.border}` }}>
                  <Avatar name={a.full_name} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: colors.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {a.full_name || "Unnamed"}{isSelf && <span style={{ fontSize: 11, fontWeight: 600, color: colors.inkFaint }}> · you</span>}
                    </div>
                    <div style={{ fontSize: 12, color: colors.inkFaint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.email}</div>
                  </div>
                  <button type="button" disabled={pending || isSelf}
                    title={isSelf ? "You can't step yourself down" : "Step down to scholar"}
                    onClick={() => { if (confirm(`Remove admin access from ${a.full_name || "this member"}? They'll become a scholar.`)) run(() => setMemberRole(a.id, "scholar")); }}
                    style={{ ...dangerBtn, cursor: isSelf ? "not-allowed" : "pointer", opacity: isSelf ? 0.5 : 1 }}>
                    <Icon name="x" size={14} /> Remove admin
                  </button>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* ---------------- Member picker overlay ---------------- */}
      {picker && (
        <MemberPicker
          title={picker === "moderator" ? "Choose a member to make a moderator" : "Choose a member to make an admin"}
          initial={picker === "moderator" ? eligibleForMod : eligibleForAdmin}
          isEligible={
            picker === "moderator"
              ? (m) => (m.role === "scholar" || m.role === "alumni") && !modIds.has(m.id)
              : (m) => m.role !== "admin"
          }
          ineligibleNote={
            picker === "moderator"
              ? "Only scholars and alumni who aren't already moderators can be assigned."
              : "This member is already an admin."
          }
          onPick={pickMember}
          onClose={() => setPicker(null)}
        />
      )}

      {/* ---------------- Capability editor overlay ---------------- */}
      {editor && (
        <Overlay onClose={() => !pending && setEditor(null)}>
          <h3 style={{ fontSize: 17, fontWeight: 800, color: colors.ink, margin: "0 0 3px" }}>
            {editor.isNew ? "Assign moderator" : "Edit capabilities"}
          </h3>
          <div style={{ fontSize: 13, color: colors.inkFaint, marginBottom: 16 }}>{editor.name} · {editor.email}</div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {MODERATOR_CAPS.map((cap) => {
              const on = editor.caps.includes(cap.key);
              return (
                <button key={cap.key} type="button"
                  onClick={() => setEditor((e) => e && ({ ...e, caps: on ? e.caps.filter((c) => c !== cap.key) : [...e.caps, cap.key] }))}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 12, textAlign: "left", cursor: "pointer",
                    background: on ? colors.tintBlue : "#fff",
                    border: `1.5px solid ${on ? colors.brand : colors.borderStrong}`,
                    borderRadius: radius.md, padding: "12px 14px",
                  }}>
                  <span style={{ width: 34, height: 34, flexShrink: 0, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", background: on ? colors.brand : colors.bg, color: on ? "#fff" : colors.inkMuted }}>
                    <Icon name={cap.icon} size={18} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: colors.ink }}>{cap.label}</div>
                    <div style={{ fontSize: 12.5, color: colors.inkFaint, marginTop: 2, lineHeight: 1.45 }}>{cap.desc}</div>
                  </div>
                  <span style={{ width: 22, height: 22, flexShrink: 0, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", background: on ? colors.brand : "#fff", border: `1.5px solid ${on ? colors.brand : colors.borderStrong}`, color: "#fff" }}>
                    {on && <Icon name="check" size={14} />}
                  </span>
                </button>
              );
            })}
          </div>

          <p style={{ fontSize: 12, color: colors.inkFaint, margin: "14px 0 0" }}>
            With no capabilities selected, saving will remove the moderator role.
          </p>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
            <button type="button" disabled={pending} onClick={() => setEditor(null)} style={ghostBtn}>Cancel</button>
            <button type="button" disabled={pending} onClick={saveModerator}
              style={{ display: "inline-flex", alignItems: "center", gap: 7, background: colors.brand, color: "#fff", border: 0, borderRadius: radius.pill, padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: shadow.brand, opacity: pending ? 0.7 : 1 }}>
              <Icon name="check" size={15} /> {pending ? "Saving…" : "Save"}
            </button>
          </div>
        </Overlay>
      )}
    </div>
  );
}

/* ---------------- helpers ---------------- */

function SectionHead({ icon, title, blurb, action }: { icon: IconName; title: string; blurb: string; action: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
      <div style={{ maxWidth: 560 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span style={{ width: 30, height: 30, borderRadius: 8, background: colors.tintBlue, color: colors.brandDeep, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name={icon} size={17} /></span>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: colors.ink, margin: 0 }}>{title}</h2>
        </div>
        <p style={{ fontSize: 13.5, color: colors.inkFaint, margin: "8px 0 0", lineHeight: 1.5 }}>{blurb}</p>
      </div>
      {action}
    </div>
  );
}

function AddButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{ display: "inline-flex", alignItems: "center", gap: 8, background: colors.brand, color: "#fff", border: 0, borderRadius: radius.pill, padding: "10px 18px", fontSize: 13.5, fontWeight: 700, cursor: "pointer", boxShadow: shadow.brand, opacity: disabled ? 0.7 : 1 }}>
      <Icon name="plus" size={15} /> {label}
    </button>
  );
}

const ghostBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", color: colors.inkMuted,
  border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.pill, padding: "8px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
};

const dangerBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", color: "#C0392B",
  border: "1.5px solid #F2C4BE", borderRadius: radius.pill, padding: "8px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
};

function EmptyBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: `1px dashed ${colors.borderStrong}`, borderRadius: radius.lg, padding: "26px", textAlign: "center", color: colors.inkFaint, fontSize: 13.5 }}>
      {children}
    </div>
  );
}

function Avatar({ name }: { name: string | null }) {
  const initials = (name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
  return (
    <span style={{ width: 40, height: 40, flexShrink: 0, borderRadius: "50%", background: colors.tintBlue, color: colors.brandDeep, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800 }}>{initials}</span>
  );
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,33,45,.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "60px 20px", zIndex: 60, overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 520, background: "#fff", borderRadius: radius.lg, boxShadow: shadow.card, padding: "24px 26px" }}>
        {children}
      </div>
    </div>
  );
}

function MemberPicker({
  title, initial, isEligible, ineligibleNote, onPick, onClose,
}: {
  title: string;
  initial: AdminMember[];
  isEligible: (m: AdminMember) => boolean;
  ineligibleNote: string;
  onPick: (m: AdminMember) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<AdminMember[]>(initial.slice(0, 60));
  const [loading, setLoading] = useState(false);
  const reqId = useRef(0);

  // Debounced live search against every member (server-side, so accounts
  // beyond the preloaded batch are still suggested as you type).
  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setLoading(false);
      setResults(initial.slice(0, 60));
      return;
    }
    setLoading(true);
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      const found = await searchMembers(term);
      if (id !== reqId.current) return; // a newer keystroke superseded this one
      setResults(found.filter(isEligible).slice(0, 60));
      setLoading(false);
    }, 220);
    return () => clearTimeout(t);
  }, [q, initial, isEligible]);

  return (
    <Overlay onClose={onClose}>
      <h3 style={{ fontSize: 17, fontWeight: 800, color: colors.ink, margin: "0 0 14px" }}>{title}</h3>
      <div style={{ position: "relative", marginBottom: 14 }}>
        <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: colors.inkFaint, pointerEvents: "none" }}><Icon name="compass" size={16} /></span>
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email…"
          style={{ width: "100%", padding: "10px 14px 10px 40px", fontSize: 14, color: colors.ink, background: "#fff", border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.pill, outline: "none" }} />
      </div>
      <div style={{ maxHeight: 360, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
        {loading ? (
          <div style={{ padding: "24px", textAlign: "center", color: colors.inkFaint, fontSize: 13.5 }}>Searching…</div>
        ) : results.length === 0 ? (
          <div style={{ padding: "24px", textAlign: "center", color: colors.inkFaint, fontSize: 13.5 }}>
            {q.trim() ? `No matching members. ${ineligibleNote}` : "No eligible members yet."}
          </div>
        ) : (
          results.map((m) => (
            <button key={m.id} type="button" onClick={() => onPick(m)}
              style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left", background: "transparent", border: 0, borderRadius: radius.md, padding: "9px 10px", cursor: "pointer" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = colors.bg)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              <Avatar name={m.full_name} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: colors.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.full_name || "Unnamed"}</div>
                <div style={{ fontSize: 12, color: colors.inkFaint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.email}</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: colors.inkMuted, background: colors.bg, borderRadius: radius.pill, padding: "3px 9px", textTransform: "capitalize", flexShrink: 0 }}>{m.role}</span>
            </button>
          ))
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
        <button type="button" onClick={onClose} style={ghostBtn}>Cancel</button>
      </div>
    </Overlay>
  );
}
