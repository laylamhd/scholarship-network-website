"use client";

import { useActionState, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { updateProfile, type SaveState } from "@/app/(app)/profile/edit/actions";
import { createClient } from "@/lib/supabase/client";
import type {
  AcademicRecord,
  Certification,
  EmploymentEntry,
  FullProfile,
  VolunteerEntry,
} from "@/lib/types";
import { colors, radius, shadow } from "@/lib/theme";
import { COUNTRIES } from "@/lib/countries";

const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: colors.inkMuted };
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px", fontSize: 14.5, color: colors.ink, background: "#fff",
  border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.md, outline: "none",
};
const labelRow: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7, minHeight: 20 };

function initials(name: string | null) {
  if (!name) return "?";
  const p = name.trim().split(/\s+/);
  return (p[0]?.[0] ?? "") + (p[1]?.[0] ?? "");
}

function EyeIcon({ on }: { on: boolean }) {
  return on ? (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 2l20 20" />
      <path d="M6.7 6.7C3.6 8.4 1.5 12 1.5 12S5 19 12 19c1.7 0 3.2-.4 4.5-1" />
      <path d="M9.9 5.2C10.6 5.1 11.3 5 12 5c7 0 10.5 7 10.5 7s-1 2-3 3.8" />
    </svg>
  );
}

function Card({ title, eye, children }: { title: string; eye?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "22px 24px", marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: colors.ink }}>{title}</div>
        {eye}
      </div>
      {children}
    </div>
  );
}
function Row({ children, cols = 2 }: { children: React.ReactNode; cols?: number }) {
  return <div className="field-grid" style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 14, marginBottom: 14 }}>{children}</div>;
}
function Field({ label, eye, children }: { label: string; eye?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div style={labelRow}><label style={labelStyle}>{label}</label>{eye}</div>
      {children}
    </div>
  );
}
function Text({ name, label, def, placeholder, type = "text", eye }: { name: string; label: string; def?: string | null; placeholder?: string; type?: string; eye?: React.ReactNode }) {
  return (
    <Field label={label} eye={eye}>
      <input id={name} name={name} type={type} defaultValue={def ?? ""} placeholder={placeholder} style={inputStyle} />
    </Field>
  );
}
// Renders <option>s for the country list, prepending any saved value that isn't in the list
// so existing profiles never lose their selection.
function countryOptions(current?: string | null) {
  const extra = current && !COUNTRIES.includes(current) ? [current] : [];
  return (
    <>
      <option value="">Select…</option>
      {extra.map((c) => <option key={c} value={c}>{c}</option>)}
      {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
    </>
  );
}
// Form-submitted country dropdown (uncontrolled, bound to a form field name).
function CountrySelect({ name, label, def, eye }: { name: string; label: string; def?: string | null; eye?: React.ReactNode }) {
  return (
    <Field label={label} eye={eye}>
      <select id={name} name={name} defaultValue={def ?? ""} style={inputStyle}>{countryOptions(def)}</select>
    </Field>
  );
}
function Area({ name, label, def, placeholder, rows = 4, eye }: { name: string; label: string; def?: string | null; placeholder?: string; rows?: number; eye?: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <Field label={label} eye={eye}>
        <textarea id={name} name={name} defaultValue={def ?? ""} placeholder={placeholder} rows={rows} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.55 }} />
      </Field>
    </div>
  );
}

const PRIVACY_KEYS = [
  "location", "nationality", "phone", "bio", "skills", "languages", "interests",
  "career_aspirations", "research_interests", "volunteer_experience", "education", "professional",
];

const emptyAcademic: AcademicRecord = { institution_name: "", degree_level: "", field_of_study: "", country_of_study: "", year_of_study: "", start_year: "", end_year: "", is_current: true, gpa: "" };
const emptyJob: EmploymentEntry = { company_name: "", job_title: "", start_date: "", end_date: "", is_current: false, description: "" };
const emptyCert: Certification = { title: "", issuing_org: "", issue_date: "", expiry_date: "", credential_url: "" };
const emptyVol: VolunteerEntry = { organization: "", role: "", start_date: "", end_date: "", is_current: false, description: "" };

export default function ProfileEditForm({
  data,
  visibilityValues,
  degreeLevels,
}: {
  data: FullProfile;
  visibilityValues: string[];
  degreeLevels: string[];
}) {
  const { profile, alumni } = data;
  const isAlumni = profile.role === "alumni";

  const [state, formAction, pending] = useActionState<SaveState, FormData>(updateProfile, null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [records, setRecords] = useState<AcademicRecord[]>(data.academic.length ? data.academic : [{ ...emptyAcademic }]);
  const [vols, setVols] = useState<VolunteerEntry[]>(data.volunteer.length ? data.volunteer : []);
  const [jobs, setJobs] = useState<EmploymentEntry[]>(data.employment.length ? data.employment : []);
  const [certs, setCerts] = useState<Certification[]>(data.certifications.length ? data.certifications : []);

  // Per-field privacy state (true = visible to others).
  const [priv, setPriv] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const k of PRIVACY_KEYS) init[k] = profile.field_privacy?.[k] !== false;
    return init;
  });
  const toggle = (k: string) => setPriv((p) => ({ ...p, [k]: !p[k] }));

  // Inline eye button bound to a privacy key.
  const eye = (k: string) => (
    <button
      type="button"
      onClick={() => toggle(k)}
      title={priv[k] ? "Visible to others — click to hide" : "Hidden — click to make public"}
      style={{
        display: "inline-flex", alignItems: "center", gap: 5, background: priv[k] ? colors.tintBlue : colors.bg,
        color: priv[k] ? colors.brandDeep : colors.inkFaint, border: `1px solid ${priv[k] ? colors.borderBlue : colors.borderStrong}`,
        borderRadius: radius.pill, padding: "3px 10px", fontSize: 11.5, fontWeight: 700, cursor: "pointer",
      }}
    >
      <EyeIcon on={priv[k]} />
      {priv[k] ? "Public" : "Private"}
    </button>
  );

  const upd = <T,>(set: React.Dispatch<React.SetStateAction<T[]>>) => (i: number, patch: Partial<T>) =>
    set((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const updRec = upd<AcademicRecord>(setRecords);
  const updVol = upd<VolunteerEntry>(setVols);
  const updJob = upd<EmploymentEntry>(setJobs);
  const updCert = upd<Certification>(setCerts);

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadErr(null);
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "png";
      const path = `${profile.id}/avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(pub.publicUrl);
    } catch (err) {
      setUploadErr(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={formAction} style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 32px 90px", width: "100%" }}>
      <input type="hidden" name="avatar_url" value={avatarUrl ?? ""} />
      <input type="hidden" name="role" value={profile.role} />
      <input type="hidden" name="academic_json" value={JSON.stringify(records)} />
      <input type="hidden" name="volunteer_json" value={JSON.stringify(vols)} />
      <input type="hidden" name="employment_json" value={JSON.stringify(jobs)} />
      <input type="hidden" name="certifications_json" value={JSON.stringify(certs)} />
      {PRIVACY_KEYS.map((k) => (
        <input key={k} type="hidden" name={`priv_${k}`} value={priv[k] ? "on" : "off"} />
      ))}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: colors.ink, margin: 0 }}>Edit profile</h1>
        <Link href="/profile" style={{ fontSize: 14, color: colors.inkMuted, fontWeight: 600 }}>Cancel</Link>
      </div>
      <div style={{ marginBottom: 22 }} />

      {/* Identity */}
      <Card title="Identity">
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 18 }}>
          {avatarUrl ? (
            <Image src={avatarUrl} alt="avatar" width={76} height={76} style={{ width: 76, height: 76, borderRadius: 999, objectFit: "cover", boxShadow: shadow.avatar }} />
          ) : (
            <div style={{ width: 76, height: 76, borderRadius: 999, background: colors.tintBlueDeep, color: colors.brandDeep, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 700, textTransform: "uppercase" }}>
              {initials(profile.full_name)}
            </div>
          )}
          <div>
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} style={{ background: colors.tintBlue, color: colors.brandDeep, border: `1.5px solid ${colors.borderBlue}`, borderRadius: radius.pill, padding: "9px 18px", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
              {uploading ? "Uploading…" : "Change photo"}
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={onPickFile} style={{ display: "none" }} />
            <div style={{ fontSize: 12, color: colors.inkFaint, marginTop: 6 }}>Optional</div>
            {uploadErr && <div style={{ fontSize: 12, color: "#C0392B", marginTop: 6 }}>{uploadErr}</div>}
          </div>
        </div>

        <Row cols={3}>
          <Text name="full_name" label="Full name" def={profile.full_name} placeholder="Layla Haddad" />
          <CountrySelect name="nationality" label="Country of nationality" def={profile.nationality} eye={eye("nationality")} />
          <Text name="phone" label="Phone" def={profile.phone} placeholder="Optional" eye={eye("phone")} />
        </Row>
        <Row>
          <Text name="date_of_birth" label="Date of birth" def={profile.date_of_birth} type="date" />
          <Text name="gender" label="Gender" def={profile.gender} placeholder="Optional" />
        </Row>

        {/* Location */}
        <div style={{ ...labelRow, marginTop: 6 }}>
          <label style={{ ...labelStyle, fontSize: 13.5, color: colors.ink, fontWeight: 700 }}>Where you live</label>
          {eye("location")}
        </div>
        <Row>
          <CountrySelect name="country" label="Country of residence" def={profile.country} />
          <Text name="city" label="City of residence" def={profile.city} placeholder="Ramallah" />
        </Row>
      </Card>

      {/* About */}
      <Card title="About you">
        <Area name="bio" label="Biography" def={profile.bio} placeholder="Tell the community about yourself…" rows={4} eye={eye("bio")} />
        <Row>
          <Area name="career_aspirations" label="Career aspirations" def={profile.career_aspirations} rows={3} eye={eye("career_aspirations")} />
          <Area name="research_interests" label="Research interests" def={profile.research_interests} rows={3} eye={eye("research_interests")} />
        </Row>
        <Text name="skills" label="Skills (comma separated)" def={data.skills.join(", ")} placeholder="Epidemiology, Data Analysis" eye={eye("skills")} />
        <div style={{ height: 14 }} />
        <Text name="languages" label="Languages (comma separated)" def={data.languages.join(", ")} placeholder="Arabic, English, French" eye={eye("languages")} />
        <div style={{ height: 14 }} />
        <Text name="interests" label="Interests (comma separated)" def={data.interests.join(", ")} placeholder="Public health, Refugee rights" eye={eye("interests")} />
      </Card>

      {/* Education */}
      <Card title="Education" eye={eye("education")}>
        {records.map((r, i) => (
          <div key={i} style={cardBox}>
            {records.length > 1 && <button type="button" onClick={() => setRecords((rs) => rs.filter((_, idx) => idx !== i))} style={removeBtn}>Remove</button>}
            <Row cols={3}>
              <Field label="Institution"><input value={r.institution_name} onChange={(e) => updRec(i, { institution_name: e.target.value })} placeholder="Birzeit University" style={inputStyle} /></Field>
              <Field label="Degree level">
                <select value={r.degree_level} onChange={(e) => updRec(i, { degree_level: e.target.value })} style={inputStyle}>
                  <option value="">Select…</option>
                  {degreeLevels.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </Field>
              <Field label="Year of study"><input value={r.year_of_study ?? ""} onChange={(e) => updRec(i, { year_of_study: e.target.value })} placeholder="2nd year" style={inputStyle} /></Field>
            </Row>
            <Row cols={3}>
              <Field label="Field of study"><input value={r.field_of_study} onChange={(e) => updRec(i, { field_of_study: e.target.value })} placeholder="Public Health" style={inputStyle} /></Field>
              <Field label="Country of study"><select value={r.country_of_study} onChange={(e) => updRec(i, { country_of_study: e.target.value })} style={inputStyle}>{countryOptions(r.country_of_study)}</select></Field>
              <Field label="GPA (optional)"><input type="number" step="0.01" value={r.gpa ?? ""} onChange={(e) => updRec(i, { gpa: e.target.value })} placeholder="3.8" style={inputStyle} /></Field>
            </Row>
            <Row cols={3}>
              <Field label="Start year"><input type="number" value={r.start_year} onChange={(e) => updRec(i, { start_year: e.target.value })} placeholder="2023" style={inputStyle} /></Field>
              <Field label="End year"><input type="number" value={r.end_year ?? ""} onChange={(e) => updRec(i, { end_year: e.target.value })} placeholder="2026" disabled={r.is_current} style={{ ...inputStyle, opacity: r.is_current ? 0.5 : 1 }} /></Field>
              <label style={checkRow}><input type="checkbox" checked={r.is_current} onChange={(e) => updRec(i, { is_current: e.target.checked })} /> Currently studying</label>
            </Row>
          </div>
        ))}
        <button type="button" onClick={() => setRecords((rs) => [...rs, { ...emptyAcademic }])} style={addBtn}>+ Add education</button>
      </Card>

      {/* Volunteer experience (all users) */}
      <Card title="Volunteer experience" eye={eye("volunteer_experience")}>
        {vols.map((v, i) => (
          <div key={i} style={cardBox}>
            <button type="button" onClick={() => setVols((rs) => rs.filter((_, idx) => idx !== i))} style={removeBtn}>Remove</button>
            <Row>
              <Field label="Organization"><input value={v.organization} onChange={(e) => updVol(i, { organization: e.target.value })} placeholder="Red Crescent" style={inputStyle} /></Field>
              <Field label="Role"><input value={v.role ?? ""} onChange={(e) => updVol(i, { role: e.target.value })} placeholder="Volunteer coordinator" style={inputStyle} /></Field>
            </Row>
            <Row cols={3}>
              <Field label="Start date"><input type="date" value={v.start_date ?? ""} onChange={(e) => updVol(i, { start_date: e.target.value })} style={inputStyle} /></Field>
              <Field label="End date"><input type="date" value={v.end_date ?? ""} onChange={(e) => updVol(i, { end_date: e.target.value })} disabled={v.is_current} style={{ ...inputStyle, opacity: v.is_current ? 0.5 : 1 }} /></Field>
              <label style={checkRow}><input type="checkbox" checked={v.is_current} onChange={(e) => updVol(i, { is_current: e.target.checked })} /> Ongoing</label>
            </Row>
            <Field label="Description (optional)"><textarea value={v.description ?? ""} onChange={(e) => updVol(i, { description: e.target.value })} rows={2} style={{ ...inputStyle, resize: "vertical" }} /></Field>
          </div>
        ))}
        <button type="button" onClick={() => setVols((rs) => [...rs, { ...emptyVol }])} style={addBtn}>+ Add volunteer experience</button>
      </Card>

      {/* Alumni-only */}
      {isAlumni && (
        <>
          <Card title="Professional" eye={eye("professional")}>
            <Row cols={3}>
              <Text name="current_position" label="Current position" def={alumni?.current_position} placeholder="Research Officer" />
              <Text name="current_employer" label="Current employer" def={alumni?.current_employer} />
              <Text name="seniority_level" label="Seniority level" def={alumni?.seniority_level} placeholder="Mid-level" />
            </Row>
            <Row>
              <Text name="sector" label="Sector" def={alumni?.sector} placeholder="Public sector" />
              <Text name="industry" label="Industry" def={alumni?.industry} placeholder="Healthcare" />
            </Row>
            <Text name="linkedin_url" label="LinkedIn URL" def={alumni?.linkedin_url} placeholder="https://linkedin.com/in/…" />
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: colors.ink, marginTop: 14, cursor: "pointer" }}>
              <input type="checkbox" name="willing_to_mentor" defaultChecked={alumni?.willing_to_mentor ?? false} /> I&apos;m open to mentoring current scholars
            </label>
          </Card>

          <Card title="Employment history" eye={eye("professional")}>
            {jobs.map((j, i) => (
              <div key={i} style={cardBox}>
                <button type="button" onClick={() => setJobs((rs) => rs.filter((_, idx) => idx !== i))} style={removeBtn}>Remove</button>
                <Row>
                  <Field label="Job title"><input value={j.job_title} onChange={(e) => updJob(i, { job_title: e.target.value })} placeholder="Research Officer" style={inputStyle} /></Field>
                  <Field label="Company"><input value={j.company_name} onChange={(e) => updJob(i, { company_name: e.target.value })} placeholder="UNRWA" style={inputStyle} /></Field>
                </Row>
                <Row cols={3}>
                  <Field label="Start date"><input type="date" value={j.start_date} onChange={(e) => updJob(i, { start_date: e.target.value })} style={inputStyle} /></Field>
                  <Field label="End date"><input type="date" value={j.end_date ?? ""} onChange={(e) => updJob(i, { end_date: e.target.value })} disabled={j.is_current} style={{ ...inputStyle, opacity: j.is_current ? 0.5 : 1 }} /></Field>
                  <label style={checkRow}><input type="checkbox" checked={j.is_current} onChange={(e) => updJob(i, { is_current: e.target.checked })} /> Current role</label>
                </Row>
                <Field label="Description (optional)"><textarea value={j.description ?? ""} onChange={(e) => updJob(i, { description: e.target.value })} rows={2} style={{ ...inputStyle, resize: "vertical" }} /></Field>
              </div>
            ))}
            <button type="button" onClick={() => setJobs((rs) => [...rs, { ...emptyJob }])} style={addBtn}>+ Add role</button>
          </Card>

          <Card title="Certifications" eye={eye("professional")}>
            {certs.map((c, i) => (
              <div key={i} style={cardBox}>
                <button type="button" onClick={() => setCerts((rs) => rs.filter((_, idx) => idx !== i))} style={removeBtn}>Remove</button>
                <Row>
                  <Field label="Title"><input value={c.title} onChange={(e) => updCert(i, { title: e.target.value })} placeholder="PMP" style={inputStyle} /></Field>
                  <Field label="Issuing organisation"><input value={c.issuing_org ?? ""} onChange={(e) => updCert(i, { issuing_org: e.target.value })} placeholder="PMI" style={inputStyle} /></Field>
                </Row>
                <Row cols={3}>
                  <Field label="Issue date"><input type="date" value={c.issue_date ?? ""} onChange={(e) => updCert(i, { issue_date: e.target.value })} style={inputStyle} /></Field>
                  <Field label="Expiry date"><input type="date" value={c.expiry_date ?? ""} onChange={(e) => updCert(i, { expiry_date: e.target.value })} style={inputStyle} /></Field>
                  <Field label="Credential URL"><input value={c.credential_url ?? ""} onChange={(e) => updCert(i, { credential_url: e.target.value })} placeholder="https://…" style={inputStyle} /></Field>
                </Row>
              </div>
            ))}
            <button type="button" onClick={() => setCerts((rs) => [...rs, { ...emptyCert }])} style={addBtn}>+ Add certification</button>
          </Card>
        </>
      )}

      {/* Master visibility */}
      <Card title="Profile visibility">
        <Field label="Appear in the scholar network">
          <select name="profile_visibility" defaultValue={profile.profile_visibility} style={{ ...inputStyle, maxWidth: 320 }}>
            {visibilityValues.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </Field>
        <div style={{ fontSize: 12.5, color: colors.inkFaint, marginTop: 8 }}>
          Set to “private” to hide your entire profile from everyone but you. Otherwise, use the eye toggles above to choose exactly what is public. Your name and photo are always visible.
        </div>
      </Card>

      {state?.error && (
        <div style={{ fontSize: 13.5, color: "#C0392B", background: "#FDEDEC", border: "1px solid #F5C6C0", padding: "10px 13px", borderRadius: radius.sm, marginBottom: 16 }}>
          {state.error}
        </div>
      )}

      <div style={{ display: "flex", gap: 12 }}>
        <button type="submit" disabled={pending || uploading} style={{ flex: "0 0 auto", minWidth: 220, padding: "14px 28px", fontSize: 15.5, fontWeight: 700, color: "#fff", background: colors.brand, border: 0, borderRadius: radius.pill, cursor: pending ? "default" : "pointer", opacity: pending || uploading ? 0.7 : 1, boxShadow: shadow.brand }}>
          {pending ? "Saving…" : "Save profile"}
        </button>
        <Link href="/profile" style={{ padding: "14px 26px", fontSize: 15.5, fontWeight: 600, color: colors.ink, background: "#fff", border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.pill, textAlign: "center" }}>
          Cancel
        </Link>
      </div>
    </form>
  );
}

const cardBox: React.CSSProperties = { border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: 16, marginBottom: 14, position: "relative" };
const removeBtn: React.CSSProperties = { position: "absolute", top: 10, insetInlineEnd: 10, background: "none", border: 0, color: colors.inkFaint, fontSize: 13, fontWeight: 600, cursor: "pointer" };
const addBtn: React.CSSProperties = { background: colors.tintBlue, color: colors.brandDeep, border: `1.5px dashed ${colors.borderBlue}`, borderRadius: radius.md, padding: 11, width: "100%", fontSize: 14, fontWeight: 700, cursor: "pointer" };
const checkRow: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: colors.inkMuted, alignSelf: "end", paddingBottom: 12, cursor: "pointer" };
