"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { isChoice, type QType } from "@/lib/surveyTypes";
import { submitSurveyResponse } from "@/app/(app)/surveys/actions";
import { colors, radius, shadow } from "@/lib/theme";

type Q = { id: string; prompt: string; qtype: QType; options: string[]; required: boolean };

export default function SurveyResponseForm({ surveyId, questions }: { surveyId: string; questions: Q[] }) {
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  function setVal(qid: string, value: unknown) {
    setAnswers((a) => ({ ...a, [qid]: value }));
  }
  function toggleMulti(qid: string, opt: string) {
    setAnswers((a) => {
      const cur = Array.isArray(a[qid]) ? (a[qid] as string[]) : [];
      return { ...a, [qid]: cur.includes(opt) ? cur.filter((o) => o !== opt) : [...cur, opt] };
    });
  }

  function isEmpty(q: Q): boolean {
    const v = answers[q.id];
    if (q.qtype === "multi_choice") return !Array.isArray(v) || v.length === 0;
    return v === undefined || v === null || v === "";
  }

  function submit() {
    setError(null);
    const missing = questions.find((q) => q.required && isEmpty(q));
    if (missing) {
      setError(`Please answer: “${missing.prompt}”`);
      return;
    }
    const payload = questions
      .filter((q) => !isEmpty(q))
      .map((q) => ({ question_id: q.id, value: answers[q.id] }));
    start(async () => {
      const res = await submitSurveyResponse(surveyId, payload);
      if (res.error) setError(res.error);
      else setDone(true);
    });
  }

  if (done) {
    return (
      <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "40px 28px", textAlign: "center" }}>
        <div style={{ width: 52, height: 52, margin: "0 auto 14px", borderRadius: 999, background: "#E6F6F0", color: "#0F8F6B", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="check" size={26} />
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: colors.ink, marginBottom: 6 }}>Thanks for responding</div>
        <p style={{ fontSize: 14, color: colors.inkFaint, margin: "0 0 18px" }}>Your answers are anonymous.</p>
        <Link href="/research?view=surveys" style={{ display: "inline-block", background: colors.brand, color: "#fff", borderRadius: radius.pill, padding: "11px 24px", fontSize: 14, fontWeight: 700, boxShadow: shadow.brand }}>
          Back to Dataset Surveys
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {questions.map((q, i) => (
          <div key={q.id} style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: colors.ink, marginBottom: 14, lineHeight: 1.4 }}>
              <span style={{ color: colors.inkFaint, fontWeight: 600 }}>{i + 1}. </span>{q.prompt}
              {q.required && <span style={{ color: "#D9534F", marginLeft: 4 }}>*</span>}
            </div>

            {q.qtype === "short_text" && (
              <input value={(answers[q.id] as string) ?? ""} onChange={(e) => setVal(q.id, e.target.value)} placeholder="Your answer" style={inp} />
            )}

            {q.qtype === "paragraph" && (
              <textarea value={(answers[q.id] as string) ?? ""} onChange={(e) => setVal(q.id, e.target.value)} rows={4} placeholder="Your answer" style={{ ...inp, resize: "vertical", lineHeight: 1.6 }} />
            )}

            {isChoice(q.qtype) && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {q.options.map((opt) => {
                  const selected = q.qtype === "single_choice" ? answers[q.id] === opt : Array.isArray(answers[q.id]) && (answers[q.id] as string[]).includes(opt);
                  return (
                    <label key={opt} style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 14px", border: `1.5px solid ${selected ? colors.brand : colors.borderStrong}`, background: selected ? colors.tintBlue : "#fff", borderRadius: radius.md, cursor: "pointer", fontSize: 14.5, color: colors.ink }}>
                      <input
                        type={q.qtype === "single_choice" ? "radio" : "checkbox"}
                        name={q.id}
                        checked={selected}
                        onChange={() => (q.qtype === "single_choice" ? setVal(q.id, opt) : toggleMulti(q.id, opt))}
                        style={{ width: 16, height: 16, accentColor: colors.brand }}
                      />
                      {opt}
                    </label>
                  );
                })}
              </div>
            )}

            {q.qtype === "rating" && (
              <div style={{ display: "flex", gap: 8 }}>
                {[1, 2, 3, 4, 5].map((n) => {
                  const selected = answers[q.id] === n;
                  return (
                    <button key={n} type="button" onClick={() => setVal(q.id, n)} style={{ width: 46, height: 46, borderRadius: radius.md, border: `1.5px solid ${selected ? colors.brand : colors.borderStrong}`, background: selected ? colors.brand : "#fff", color: selected ? "#fff" : colors.inkMuted, fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
                      {n}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {error && (
        <div style={{ fontSize: 13.5, color: "#C0392B", background: "#FDEDEC", border: "1px solid #F5C6C0", padding: "10px 13px", borderRadius: radius.sm, marginTop: 16 }}>
          {error}
        </div>
      )}

      <button onClick={submit} disabled={pending} style={{ marginTop: 20, minWidth: 180, padding: "13px 28px", fontSize: 15, fontWeight: 700, color: "#fff", background: colors.brand, border: 0, borderRadius: radius.pill, cursor: pending ? "default" : "pointer", opacity: pending ? 0.7 : 1, boxShadow: shadow.brand }}>
        {pending ? "Submitting…" : "Submit response"}
      </button>
    </div>
  );
}

const inp: React.CSSProperties = {
  width: "100%", padding: "11px 14px", fontSize: 14.5, color: colors.ink, background: "#fff",
  border: `1.5px solid ${colors.borderStrong}`, borderRadius: radius.md, outline: "none",
};
