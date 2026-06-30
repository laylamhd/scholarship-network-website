"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createOffer, updateOffer } from "@/app/(app)/alumni/actions";
import { ALUMNI_OFFER_KINDS, offerKindIcon, offerKindColor, offerKindBlurb } from "@/lib/alumniOffers";
import { Icon } from "@/components/Icon";
import { colors, radius, shadow } from "@/lib/theme";

type Offer = { id: string; kind: string; title: string; details: string | null; is_open: boolean };

export default function AlumniOfferForm({
  offer,
  variant = "solid",
}: {
  offer?: Offer;
  variant?: "solid" | "ghost" | "link";
}) {
  const editing = Boolean(offer);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState(offer?.kind ?? ALUMNI_OFFER_KINDS[0]);
  const [title, setTitle] = useState(offer?.title ?? "");
  const [details, setDetails] = useState(offer?.details ?? "");
  const [isOpen, setIsOpen] = useState(offer?.is_open ?? true);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function submit() {
    setError(null);
    if (!title.trim()) { setError("A short title is required."); return; }
    const fd = new FormData();
    fd.set("kind", kind);
    fd.set("title", title);
    fd.set("details", details);
    fd.set("is_open", String(isOpen));
    start(async () => {
      const res = editing ? await updateOffer(offer!.id, null, fd) : await createOffer(null, fd);
      if (res?.error) setError(res.error);
      else {
        setOpen(false);
        if (!editing) { setTitle(""); setDetails(""); setKind(ALUMNI_OFFER_KINDS[0]); setIsOpen(true); }
        router.refresh();
      }
    });
  }

  const trigger =
    variant === "link" ? (
      <button type="button" onClick={() => setOpen(true)} style={{ background: "none", border: 0, color: colors.brandDeep, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
        <Icon name="user" size={14} /> Edit
      </button>
    ) : (
      <button type="button" onClick={() => setOpen(true)} style={{
        display: "inline-flex", alignItems: "center", gap: 8, borderRadius: radius.pill, padding: "11px 22px", fontSize: 14, fontWeight: 700, cursor: "pointer",
        ...(variant === "solid"
          ? { background: colors.brand, color: "#fff", border: 0, boxShadow: shadow.brand }
          : { background: "#fff", color: colors.brandDeep, border: `1.5px solid ${colors.borderBlue}` }),
      }}>
        <Icon name="plus" size={16} /> {editing ? "Edit offer" : "Offer to help"}
      </button>
    );

  return (
    <>
      {trigger}

      {open && (
        <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(33,45,55,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: radius.lg, boxShadow: shadow.card, width: "100%", maxWidth: 540, padding: "24px 26px", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: colors.ink }}>{editing ? "Edit your offer" : "Offer to help a scholar"}</div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" style={{ background: "none", border: 0, cursor: "pointer", color: colors.inkFaint }}><Icon name="x" size={20} /></button>
            </div>
            <p style={{ fontSize: 13.5, color: colors.inkFaint, margin: "0 0 18px", lineHeight: 1.5 }}>
              Choose a way you&apos;d like to give back. Scholars can express interest and message you directly.
            </p>

            {/* Kind picker */}
            <label style={lbl}>Type of help</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8, marginBottom: 16 }}>
              {ALUMNI_OFFER_KINDS.map((k) => {
                const active = kind === k;
                const accent = offerKindColor(k);
                return (
                  <button key={k} type="button" onClick={() => setKind(k)} style={{
                    display: "flex", alignItems: "center", gap: 9, textAlign: "left", cursor: "pointer",
                    border: `1.5px solid ${active ? accent : colors.borderStrong}`, background: active ? `${accent}12` : "#fff",
                    borderRadius: radius.md, padding: "10px 12px",
                  }}>
                    <span style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 999, background: `${accent}18`, color: accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon name={offerKindIcon(k)} size={16} />
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: colors.ink }}>{k}</span>
                      <span style={{ display: "block", fontSize: 11, color: colors.inkFaint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{offerKindBlurb(k)}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus placeholder="e.g. Mock interviews for finance roles" style={field()} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Details <span style={{ fontWeight: 400, color: colors.inkFaint }}>(optional)</span></label>
              <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={4} placeholder="Who is this for, what you can offer, and how it works." style={{ ...field(), resize: "vertical", lineHeight: 1.5 }} />
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13.5, color: colors.inkMuted, marginBottom: 18, cursor: "pointer" }}>
              <input type="checkbox" checked={isOpen} onChange={(e) => setIsOpen(e.target.checked)} style={{ width: 16, height: 16, accentColor: colors.brand }} />
              Currently accepting interest
            </label>

            {error && <div style={{ fontSize: 12.5, color: "#C0392B", marginBottom: 12 }}>{error}</div>}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setOpen(false)} style={{ background: "#fff", border: `1.5px solid ${colors.borderStrong}`, color: colors.inkMuted, borderRadius: radius.pill, padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
              <button type="button" onClick={submit} disabled={pending} style={{ background: colors.brand, color: "#fff", border: 0, borderRadius: radius.pill, padding: "10px 24px", fontSize: 14, fontWeight: 700, cursor: pending ? "default" : "pointer", opacity: pending ? 0.7 : 1, boxShadow: shadow.brand }}>
                {pending ? "Saving…" : editing ? "Save changes" : "Publish offer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const lbl: React.CSSProperties = { display: "block", fontSize: 12.5, fontWeight: 700, color: colors.inkMuted, marginBottom: 7 };
function field(): React.CSSProperties {
  return { width: "100%", padding: "10px 12px", fontSize: 14, color: colors.ink, background: "#fff", border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.md, outline: "none" };
}
