"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loadPendingItems, reviewContent } from "@/app/(app)/admin/actions";
import { notificationLink } from "@/lib/notificationLink";
import { Icon } from "@/components/Icon";
import { colors, radius, shadow } from "@/lib/theme";
import type { PendingItem } from "@/lib/admin";

export default function ContentModeration({
  entity, label, onClose,
}: {
  entity: string;
  label: string;
  onClose: () => void;
}) {
  const [items, setItems] = useState<PendingItem[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  useEffect(() => {
    let on = true;
    loadPendingItems(entity).then((res) => { if (on) setItems(res); });
    return () => { on = false; };
  }, [entity]);

  function decide(id: string, decision: "approved" | "rejected", note?: string) {
    setBusy(id + decision);
    start(async () => {
      const res = await reviewContent(entity, id, decision, note);
      setBusy(null);
      if (!res.error) {
        setRejectingId(null);
        setReason("");
        setItems((cur) => (cur ? cur.filter((i) => i.id !== id) : cur));
        router.refresh();
      }
    });
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(33,45,55,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: radius.lg, boxShadow: shadow.card, width: "100%", maxWidth: 620, maxHeight: "86vh", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: `1px solid ${colors.border}` }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: colors.ink }}>Review {label.toLowerCase()}</div>
            <div style={{ fontSize: 13, color: colors.inkFaint, marginTop: 2 }}>Approve to publish, or reject to keep hidden.</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: "none", border: 0, cursor: "pointer", color: colors.inkFaint }}><Icon name="x" size={20} /></button>
        </div>

        <div style={{ padding: "16px 24px 24px", overflowY: "auto" }}>
          {items === null ? (
            <div style={{ padding: "30px", textAlign: "center", color: colors.inkFaint, fontSize: 14 }}>Loading…</div>
          ) : items.length === 0 ? (
            <div style={{ padding: "30px", textAlign: "center", color: colors.inkFaint, fontSize: 14 }}>
              <Icon name="check" size={26} /><div style={{ marginTop: 8 }}>Nothing pending — all caught up.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {items.map((it) => {
                const link = notificationLink({ entity_type: entity, entity_id: it.id });
                return (
                  <div key={it.id} style={{ border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: "15px 16px" }}>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: colors.ink }}>{it.title}</span>
                      <span style={{ fontSize: 12, color: colors.inkFaint, flexShrink: 0 }}>{new Date(it.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: colors.inkMuted, marginTop: 3 }}>by {it.author_name}</div>
                    {it.summary && <p style={{ fontSize: 13, color: colors.inkMuted, margin: "9px 0 0", lineHeight: 1.5 }}>{it.summary}</p>}

                    {rejectingId === it.id ? (
                      <div style={{ marginTop: 12 }}>
                        <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: colors.inkMuted, marginBottom: 6 }}>
                          Reason for rejection <span style={{ fontWeight: 400, color: colors.inkFaint }}>(shared with the author)</span>
                        </label>
                        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} autoFocus
                          placeholder="Let them know what to fix so they can resubmit."
                          style={{ width: "100%", padding: "10px 12px", fontSize: 13.5, color: colors.ink, background: "#fff", border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.md, outline: "none", resize: "vertical", lineHeight: 1.5 }} />
                        <div style={{ display: "flex", gap: 8, marginTop: 9 }}>
                          <button type="button" disabled={pending} onClick={() => decide(it.id, "rejected", reason)}
                            style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#C0392B", color: "#fff", border: 0, borderRadius: radius.pill, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: busy === it.id + "rejected" ? 0.6 : 1 }}>
                            <Icon name="x" size={14} /> Confirm rejection
                          </button>
                          <button type="button" onClick={() => { setRejectingId(null); setReason(""); }}
                            style={{ background: "#fff", color: colors.inkMuted, border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.pill, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 8, marginTop: 13, flexWrap: "wrap" }}>
                        <button type="button" disabled={pending} onClick={() => decide(it.id, "approved")}
                          style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#0F8F6B", color: "#fff", border: 0, borderRadius: radius.pill, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: busy === it.id + "approved" ? 0.6 : 1 }}>
                          <Icon name="check" size={14} /> Approve
                        </button>
                        <button type="button" disabled={pending} onClick={() => { setRejectingId(it.id); setReason(""); }}
                          style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", color: "#C0392B", border: `1.5px solid #F5C6C0`, borderRadius: radius.pill, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                          <Icon name="x" size={14} /> Reject
                        </button>
                        {link && (
                          <a href={link} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", color: colors.brandDeep, border: `1.5px solid ${colors.borderBlue}`, borderRadius: radius.pill, padding: "8px 16px", fontSize: 13, fontWeight: 700 }}>
                            <Icon name="externalLink" size={14} /> Preview
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
