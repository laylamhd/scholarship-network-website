"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { QTYPES, isChoice, type QType } from "@/lib/surveyTypes";
import { createSurvey, type SurveyFormState } from "@/app/(app)/surveys/actions";
import { colors, radius, shadow } from "@/lib/theme";

type Q = { key: string; prompt: string; qtype: QType; options: string[]; required: boolean };

const label: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 600, color: colors.inkMuted, marginBottom: 7 };
const input: React.CSSProperties = {
  width: "100%", padding: "11px 14px", fontSize: 14.5, color: colors.ink, background: "#fff",
  border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.md, outline: "none",
};

let seq = 0;
const newQ = (): Q => ({ key: `q${Date.now()}-${seq++}`, prompt: "", qtype: "short_text", options: ["", ""], required: false });

export default function SurveyBuilder() {
  const [state, formAction, pending] = useActionState<SurveyFormState, FormData>(createSurvey, null);
  const [questions, setQuestions] = useState<Q[]>([newQ()]);

  function update(key: string, patch: Partial<Q>) {
    setQuestions((qs) => qs.map((q) => (q.key === key ? { ...q, ...patch } : q)));
  }
  function changeType(key: string, qtype: QType) {
    setQuestions((qs) =>
      qs.map((q) => {
        if (q.key !== key) return q;
        const options = isChoice(qtype) && q.options.length < 2 ? ["", ""] : q.options;
        return { ...q, qtype, options };
      }),
    );
  }
  function setOption(key: string, idx: number, val: string) {
    setQuestions((qs) => qs.map((q) => (q.key === key ? { ...q, options: q.options.map((o, i) => (i === idx ? val : o)) } : q)));
  }
  function addOption(key: string) {
    setQuestions((qs) => qs.map((q) => (q.key === key ? { ...q, options: [...q.options, ""] } : q)));
  }
  function removeOption(key: string, idx: number) {
    setQuestions((qs) => qs.map((q) => (q.key === key ? { ...q, options: q.options.filter((_, i) => i !== idx) } : q)));
  }
  function move(key: string, dir: -1 | 1) {
    setQuestions((qs) => {
      const i = qs.findIndex((q) => q.key === key);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= qs.length) return qs;
      const copy = [...qs];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }

  const serialized = JSON.stringify(
    questions.map((q) => ({ prompt: q.prompt, qtype: q.qtype, options: q.options, required: q.required })),
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="questions" value={serialized} />

      {/* Survey meta */}
      <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: 24, marginBottom: 18 }}>
        <div style={{ marginBottom: 16 }}>
          <label style={label} htmlFor="title">Survey title</label>
          <input id="title" name="title" placeholder="e.g. Scholar wellbeing check-in" style={input} required />
        </div>
        <div>
          <label style={label} htmlFor="description">Description <span style={{ fontWeight: 400, color: colors.inkFaint }}>(optional)</span></label>
          <textarea id="description" name="description" rows={3} placeholder="Tell respondents what this survey is for and how the data will be used." style={{ ...input, resize: "vertical", lineHeight: 1.6 }} />
        </div>
      </div>

      {/* Questions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {questions.map((q, i) => (
          <div key={q.key} style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: colors.inkFaint }}>Question {i + 1}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <button type="button" onClick={() => move(q.key, -1)} disabled={i === 0} title="Move up" style={iconBtn(i === 0)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 14l6-6 6 6" /></svg>
                </button>
                <button type="button" onClick={() => move(q.key, 1)} disabled={i === questions.length - 1} title="Move down" style={iconBtn(i === questions.length - 1)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 10l6 6 6-6" /></svg>
                </button>
                <button type="button" onClick={() => setQuestions((qs) => (qs.length > 1 ? qs.filter((x) => x.key !== q.key) : qs))} disabled={questions.length === 1} title="Remove" style={iconBtn(questions.length === 1)}>
                  <Icon name="x" size={16} />
                </button>
              </div>
            </div>

            <input
              value={q.prompt}
              onChange={(e) => update(q.key, { prompt: e.target.value })}
              placeholder="Question text"
              style={{ ...input, marginBottom: 12 }}
            />

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: isChoice(q.qtype) ? 14 : 0 }}>
              <select value={q.qtype} onChange={(e) => changeType(q.key, e.target.value as QType)} style={{ ...input, width: "auto", minWidth: 180 }}>
                {QTYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13.5, color: colors.inkMuted, cursor: "pointer" }}>
                <input type="checkbox" checked={q.required} onChange={(e) => update(q.key, { required: e.target.checked })} style={{ width: 16, height: 16, accentColor: colors.brand }} />
                Required
              </label>
            </div>

            {isChoice(q.qtype) && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {q.options.map((opt, oi) => (
                  <div key={oi} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 15, height: 15, flexShrink: 0, border: `1.5px solid ${colors.borderStrong}`, borderRadius: q.qtype === "single_choice" ? 999 : 4 }} />
                    <input value={opt} onChange={(e) => setOption(q.key, oi, e.target.value)} placeholder={`Option ${oi + 1}`} style={{ ...input, padding: "8px 12px" }} />
                    <button type="button" onClick={() => removeOption(q.key, oi)} disabled={q.options.length <= 2} title="Remove option" style={iconBtn(q.options.length <= 2)}>
                      <Icon name="x" size={15} />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => addOption(q.key)} style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", border: 0, color: colors.brandDeep, fontSize: 13.5, fontWeight: 700, cursor: "pointer", padding: "4px 2px" }}>
                  <Icon name="plus" size={15} /> Add option
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <button type="button" onClick={() => setQuestions((qs) => [...qs, newQ()])} style={{ marginTop: 14, display: "inline-flex", alignItems: "center", gap: 7, background: colors.tintBlue, color: colors.brandDeep, border: `1.5px solid ${colors.borderBlue}`, borderRadius: radius.pill, padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
        <Icon name="plus" size={16} /> Add question
      </button>

      {state?.error && (
        <div style={{ fontSize: 13.5, color: "#C0392B", background: "#FDEDEC", border: "1px solid #F5C6C0", padding: "10px 13px", borderRadius: radius.sm, margin: "18px 0 0" }}>
          {state.error}
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: 22 }}>
        <button type="submit" disabled={pending} style={{ minWidth: 170, padding: "13px 26px", fontSize: 15, fontWeight: 700, color: "#fff", background: colors.brand, border: 0, borderRadius: radius.pill, cursor: pending ? "default" : "pointer", opacity: pending ? 0.7 : 1, boxShadow: shadow.brand }}>
          {pending ? "Creating…" : "Create survey"}
        </button>
        <Link href="/research?view=surveys" style={{ padding: "13px 24px", fontSize: 15, fontWeight: 600, color: colors.ink, background: "#fff", border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.pill }}>
          Cancel
        </Link>
      </div>
    </form>
  );
}

function iconBtn(disabled: boolean): React.CSSProperties {
  return {
    display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30,
    border: 0, background: "transparent", borderRadius: radius.sm,
    color: disabled ? colors.inkFaint : colors.inkMuted, cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.45 : 1,
  };
}
