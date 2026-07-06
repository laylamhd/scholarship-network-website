import Link from "next/link";
import { safeUrl } from "@/lib/safeUrl";
import Image from "next/image";
import { type AlumniCard, type OfferCard } from "@/lib/alumni";
import { offerKindIcon, offerKindColor } from "@/lib/alumniOffers";
import { startConversation } from "@/app/(app)/messages/actions";
import AlumniSearch from "@/components/AlumniSearch";
import AlumniOfferForm from "@/components/AlumniOfferForm";
import OfferInterestButton from "@/components/OfferInterestButton";
import OfferDeleteButton from "@/components/OfferDeleteButton";
import OfferKindFilter from "@/components/OfferKindFilter";
import { Icon } from "@/components/Icon";
import { colors, radius, shadow } from "@/lib/theme";

export type AlumniNetworkProps = {
  /** Path the filter links / search route back to (e.g. "/" on Home, "/alumni" standalone). */
  basePath: string;
  /** Query params always carried on filter/search links (e.g. { tab: "network", view: "people" }). */
  baseParams?: Record<string, string>;
  /** Which sub-view of My network is open. */
  view: "people" | "offers";
  isAlumni: boolean;
  alumni: AlumniCard[];
  publicOffers: OfferCard[];
  myOffers: OfferCard[];
  kindCounts: Record<string, number>;
  totalOpen: number;
  q?: string;
  kindFilter?: string;
  mentorsOnly: boolean;
};

/**
 * The Alumni Network body. To stay clear for first-time users, it shows ONE
 * focused screen at a time via a segmented control: "Alumni" (the directory)
 * or "Give back" (offers of support). The hero/stat strip lives in the host page.
 */
export default function AlumniNetwork({
  basePath,
  baseParams = {},
  view,
  isAlumni,
  alumni,
  publicOffers,
  myOffers,
  kindCounts,
  totalOpen,
  q,
  kindFilter,
  mentorsOnly,
}: AlumniNetworkProps) {
  // Filter/search links keep every base param (tab + current view) plus their own extras.
  const mkHref = (extra: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(baseParams)) sp.set(k, v);
    for (const [k, v] of Object.entries(extra)) if (v) sp.set(k, v);
    const s = sp.toString();
    return s ? `${basePath}?${s}` : basePath;
  };

  // Switching sub-view resets any filters/search for a clean start.
  const viewHref = (v: "people" | "offers") => {
    const sp = new URLSearchParams();
    for (const [k, val] of Object.entries(baseParams)) sp.set(k, val);
    sp.set("view", v);
    return `${basePath}?${sp.toString()}`;
  };

  return (
    <div>
      {/* Segmented sub-tabs: one focused screen at a time. */}
      <div style={{ display: "inline-flex", gap: 4, background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: radius.pill, padding: 4, marginBottom: 10 }}>
        <SubTab href={viewHref("people")} active={view === "people"} icon="users" label="Alumni" />
        <SubTab href={viewHref("offers")} active={view === "offers"} icon="heart" label="Give back" />
      </div>
      {view === "people" && (
        <p style={{ fontSize: 13.5, color: colors.inkFaint, margin: "0 0 24px" }}>
          Find graduates of the programme and message them directly.
        </p>
      )}

      {view === "people" ? (
        /* ============ Alumni directory ============ */
        <section>
          <SectionHead title="Browse alumni" />

          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 22 }}>
            <AlumniSearch initialQuery={q ?? ""} basePath={basePath} baseParams={baseParams} />
            <Link
              href={mkHref({ q, mentors: mentorsOnly ? undefined : "1" })}
              style={{
                display: "inline-flex", alignItems: "center", gap: 7, borderRadius: radius.pill, padding: "10px 18px", fontSize: 13.5, fontWeight: 700,
                border: `1.5px solid ${mentorsOnly ? colors.brand : colors.borderStrong}`,
                background: mentorsOnly ? colors.tintBlue : "#fff",
                color: mentorsOnly ? colors.brandDeep : colors.inkMuted,
              }}
            >
              <Icon name="handshake" size={15} /> Open to mentoring
            </Link>
          </div>

          {alumni.length === 0 ? (
            <EmptyBox>
              {q ? `No alumni match “${q}”.` : mentorsOnly ? "No alumni are open to mentoring just yet." : "No alumni in the network yet. As scholars graduate, they'll appear here."}
            </EmptyBox>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
              {alumni.map((a) => <AlumniCardView key={a.id} a={a} />)}
            </div>
          )}
        </section>
      ) : (
        /* ============ Give back: your offers + offers from alumni ============ */
        <div>
          {/* Alumni's own offers, kept beside the offers they can browse. */}
          {isAlumni && (
            <section style={{ marginBottom: 38 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap", marginBottom: 16 }}>
                <SectionHead title="Your offers" />
                {myOffers.length > 0 && <AlumniOfferForm variant="solid" />}
              </div>
              {myOffers.length === 0 ? (
                <div style={{ background: "#fff", border: `1px dashed ${colors.borderStrong}`, borderRadius: radius.lg, padding: "26px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 14, color: colors.inkMuted, lineHeight: 1.5 }}>
                    You haven&apos;t offered anything yet. Mentoring, a talk, a referral or a CV review all make a difference.
                  </div>
                  <AlumniOfferForm variant="solid" />
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))", gap: 16 }}>
                  {myOffers.map((o) => <OfferCardView key={o.id} o={o} own />)}
                </div>
              )}
            </section>
          )}

          {/* Offers from other alumni. */}
          <section>
            <SectionHead title="Offers from alumni" />
            <div style={{ marginBottom: 20 }}>
              <OfferKindFilter basePath={basePath} baseParams={baseParams} selected={kindFilter} counts={kindCounts} totalOpen={totalOpen} />
            </div>

            {publicOffers.length === 0 ? (
              <EmptyBox>
                {kindFilter ? `No open “${kindFilter}” offers right now.` : "No offers yet — alumni support will appear here as it's posted."}
              </EmptyBox>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))", gap: 16 }}>
                {publicOffers.map((o) => <OfferCardView key={o.id} o={o} />)}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

/* ---------- segmented sub-tab ---------- */
function SubTab({ href, active, icon, label }: { href: string; active: boolean; icon: string; label: string }) {
  return (
    <Link
      href={href}
      style={{
        display: "inline-flex", alignItems: "center", gap: 7,
        borderRadius: radius.pill, padding: "9px 18px",
        fontSize: 14, fontWeight: 700,
        background: active ? "#fff" : "transparent",
        color: active ? colors.brandDeep : colors.inkMuted,
        boxShadow: active ? shadow.card : "none",
      }}
    >
      <Icon name={icon} size={16} /> {label}
    </Link>
  );
}

function initials(name: string): string {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase();
}

function Avatar({ url, name, size = 52 }: { url: string | null; name: string; size?: number }) {
  if (url) {
    return <Image src={url} alt={name} width={size} height={size} style={{ width: size, height: size, borderRadius: 999, objectFit: "cover" }} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: 999, background: colors.tintBlueDeep, color: colors.brandDeep, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.34, fontWeight: 700, flexShrink: 0 }}>
      {initials(name)}
    </div>
  );
}

function SectionHead({ title, hint }: { title: string; hint?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: colors.ink, margin: 0 }}>{title}</h2>
      {hint && <p style={{ fontSize: 13.5, color: colors.inkFaint, margin: "5px 0 0" }}>{hint}</p>}
    </div>
  );
}

function EmptyBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "40px", textAlign: "center", color: colors.inkFaint, fontSize: 14.5 }}>
      {children}
    </div>
  );
}

/* ---------- offer card ---------- */
function OfferCardView({ o, own }: { o: OfferCard; own?: boolean }) {
  const accent = offerKindColor(o.kind);
  return (
    <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "20px", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 700, color: accent, background: `${accent}14`, borderRadius: radius.pill, padding: "5px 12px" }}>
          <Icon name={offerKindIcon(o.kind)} size={14} /> {o.kind}
        </span>
        {own && !o.is_open && (
          <span style={{ fontSize: 11, fontWeight: 700, color: colors.inkFaint, background: colors.bg, borderRadius: radius.pill, padding: "4px 10px" }}>Closed</span>
        )}
      </div>

      <h3 style={{ fontSize: 16.5, fontWeight: 700, color: colors.ink, margin: "13px 0 0", lineHeight: 1.35 }}>{o.title}</h3>
      {o.details && (
        <p style={{ fontSize: 13.5, color: colors.inkMuted, margin: "8px 0 0", lineHeight: 1.55, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", flex: 1 }}>
          {o.details}
        </p>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16, paddingTop: 14, borderTop: `1px solid ${colors.border}` }}>
        <Link href={`/scholars/${o.alumni_id}`} style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
          <Avatar url={o.author_avatar} name={o.author_name} size={34} />
          <span style={{ fontSize: 13.5, fontWeight: 600, color: colors.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.author_name}</span>
        </Link>
      </div>

      <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {own ? (
          <>
            <span style={{ fontSize: 13, color: colors.inkFaint, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Icon name="users" size={15} /> {o.interest_count} interested
            </span>
            <span style={{ flex: 1 }} />
            <AlumniOfferForm offer={{ id: o.id, kind: o.kind, title: o.title, details: o.details, is_open: o.is_open }} variant="link" />
            <OfferDeleteButton offerId={o.id} />
          </>
        ) : (
          <>
            <OfferInterestButton offerId={o.id} interested={o.i_interested} count={o.interest_count} disabled={!o.is_open} />
            <form action={startConversation.bind(null, o.alumni_id)}>
              <button type="submit" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", color: colors.brandDeep, border: `1.5px solid ${colors.borderBlue}`, borderRadius: radius.pill, padding: "9px 16px", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
                <Icon name="chat" size={15} /> Message
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- alumni directory card ---------- */
function AlumniCardView({ a }: { a: AlumniCard }) {
  const roleLine = [a.current_position, a.current_employer].filter(Boolean).join(" · ");
  const place = [a.nationality, a.country].filter(Boolean).join(" · ");
  const meta = [a.industry || a.sector, a.years_of_experience ? `${a.years_of_experience} yrs experience` : null].filter(Boolean).join(" · ");

  return (
    <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "20px", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Link href={`/scholars/${a.id}`}><Avatar url={a.avatar_url} name={a.full_name} size={56} /></Link>
        <div style={{ minWidth: 0 }}>
          <Link href={`/scholars/${a.id}`} style={{ fontSize: 15.5, fontWeight: 700, color: colors.ink }}>{a.full_name}</Link>
          {roleLine && <div style={{ fontSize: 13, color: colors.inkMuted, marginTop: 2 }}>{roleLine}</div>}
          {place && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12.5, color: colors.inkFaint, marginTop: 3 }}>
              <Icon name="pin" size={13} /> {place}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 14 }}>
        {meta && (
          <span style={{ fontSize: 12, fontWeight: 600, color: colors.brandDeep, background: colors.tintBlue, borderRadius: radius.pill, padding: "4px 11px" }}>{meta}</span>
        )}
        {a.willing_to_mentor && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: "#0F8F6B", background: "#0F8F6B14", borderRadius: radius.pill, padding: "4px 11px" }}>
            <Icon name="handshake" size={13} /> Mentor
          </span>
        )}
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <form action={startConversation.bind(null, a.id)} style={{ flex: 1, minWidth: 120 }}>
          <button type="submit" style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, background: colors.brand, color: "#fff", border: 0, borderRadius: radius.pill, padding: "9px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: shadow.brand }}>
            <Icon name="chat" size={15} /> Message
          </button>
        </form>
        {a.linkedin_url && (
          <a href={safeUrl(a.linkedin_url)} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, background: "#fff", color: colors.brandDeep, border: `1.5px solid ${colors.borderBlue}`, borderRadius: radius.pill, padding: "9px 16px", fontSize: 13, fontWeight: 700 }}>
            <Icon name="externalLink" size={14} /> LinkedIn
          </a>
        )}
      </div>
    </div>
  );
}
