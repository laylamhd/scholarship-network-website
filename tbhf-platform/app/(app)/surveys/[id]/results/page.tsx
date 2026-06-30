import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/profiles";
import { getSurveyResults, type SurveyQuestion } from "@/lib/surveys";
import { isChoice } from "@/lib/surveyTypes";
import SurveyOwnerControls from "@/components/SurveyOwnerControls";
import { Icon } from "@/components/Icon";
import { colors, radius } from "@/lib/theme";

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default async function SurveyResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const data = await getSurveyResults(id);
  if (!data) notFound();

  const { survey, questions, response_count, responses } = data;

  function answersFor(q: SurveyQuestion): unknown[] {
    return responses.map((r) => r.answers[q.id]).filter((v) => v !== undefined && v !== null && v !== "");
  }

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "32px", width: "100%" }}>
      <Link href="/research?view=surveys" style={{ fontSize: 13.5, color: colors.brand, fontWeight: 600 }}>‹ Dataset Surveys</Link>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", margin: "14px 0 8px" }}>
        <div>
          <h1 style={{ fontSize: 27, fontWeight: 800, color: colors.ink, margin: 0, lineHeight: 1.2 }}>{survey.title}</h1>
          {survey.description && <p style={{ fontSize: 14.5, color: colors.inkMuted, lineHeight: 1.6, margin: "8px 0 0" }}>{survey.description}</p>}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", fontSize: 13, color: colors.inkFaint, marginBottom: 18 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700, color: colors.brandDeep }}>
          <Icon name="barChart" size={15} /> {response_count} response{response_count === 1 ? "" : "s"}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontWeight: 700, color: survey.is_open ? "#0F8F6B" : colors.inkFaint }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: survey.is_open ? "#0F8F6B" : colors.inkFaint }} /> {survey.is_open ? "Open" : "Closed"}
        </span>
        <span>Created {fmtDate(survey.created_at)}</span>
      </div>

      <div style={{ marginBottom: 26 }}>
        <SurveyOwnerControls surveyId={id} isOpen={survey.is_open} />
        <div style={{ display: "flex", gap: 14, marginTop: 12 }}>
          <Link href={`/surveys/${id}`} style={{ fontSize: 13, color: colors.brand, fontWeight: 600 }}>View respondent page ›</Link>
        </div>
      </div>

      {response_count === 0 ? (
        <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "46px", textAlign: "center", color: colors.inkFaint, fontSize: 14.5 }}>
          No responses yet. Share the respondent link to start collecting data.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {questions.map((q, i) => {
            const answers = answersFor(q);
            return (
              <div key={q.id} style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: 22 }}>
                <div style={{ fontSize: 15.5, fontWeight: 700, color: colors.ink, lineHeight: 1.4, marginBottom: 4 }}>
                  <span style={{ color: colors.inkFaint, fontWeight: 600 }}>{i + 1}. </span>{q.prompt}
                </div>
                <div style={{ fontSize: 12.5, color: colors.inkFaint, marginBottom: 16 }}>{answers.length} answer{answers.length === 1 ? "" : "s"}</div>

                {isChoice(q.qtype) && <ChoiceBars options={q.options} answers={answers} multi={q.qtype === "multi_choice"} />}
                {q.qtype === "rating" && <RatingSummary answers={answers} />}
                {(q.qtype === "short_text" || q.qtype === "paragraph") && <TextAnswers answers={answers} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ChoiceBars({ options, answers, multi }: { options: string[]; answers: unknown[]; multi: boolean }) {
  const counts = new Map<string, number>();
  options.forEach((o) => counts.set(o, 0));
  answers.forEach((a) => {
    const picks = multi ? (Array.isArray(a) ? (a as string[]) : []) : [String(a)];
    picks.forEach((p) => counts.set(p, (counts.get(p) ?? 0) + 1));
  });
  const total = answers.length || 1;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
      {options.map((o) => {
        const c = counts.get(o) ?? 0;
        const pct = Math.round((c / total) * 100);
        return (
          <div key={o}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, color: colors.ink, marginBottom: 5 }}>
              <span>{o}</span>
              <span style={{ color: colors.inkFaint, fontWeight: 600 }}>{c} · {pct}%</span>
            </div>
            <div style={{ height: 9, borderRadius: 999, background: colors.bg, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: colors.brand, borderRadius: 999 }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RatingSummary({ answers }: { answers: unknown[] }) {
  const nums = answers.map((a) => Number(a)).filter((n) => n >= 1 && n <= 5);
  const avg = nums.length ? (nums.reduce((s, n) => s + n, 0) / nums.length) : 0;
  const dist = [1, 2, 3, 4, 5].map((n) => nums.filter((x) => x === n).length);
  const max = Math.max(1, ...dist);
  return (
    <div>
      <div style={{ fontSize: 24, fontWeight: 800, color: colors.brandDeep, marginBottom: 14 }}>{avg.toFixed(1)} <span style={{ fontSize: 14, fontWeight: 600, color: colors.inkFaint }}>/ 5 average</span></div>
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {[1, 2, 3, 4, 5].map((n) => {
          const c = dist[n - 1];
          return (
            <div key={n} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 14, fontSize: 13, fontWeight: 700, color: colors.inkMuted }}>{n}</span>
              <div style={{ flex: 1, height: 9, borderRadius: 999, background: colors.bg, overflow: "hidden" }}>
                <div style={{ width: `${Math.round((c / max) * 100)}%`, height: "100%", background: colors.brand, borderRadius: 999 }} />
              </div>
              <span style={{ width: 28, textAlign: "right", fontSize: 13, color: colors.inkFaint, fontWeight: 600 }}>{c}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TextAnswers({ answers }: { answers: unknown[] }) {
  if (answers.length === 0) return <div style={{ fontSize: 13.5, color: colors.inkFaint }}>No answers yet.</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      {answers.map((a, i) => (
        <div key={i} style={{ fontSize: 14, color: colors.ink, lineHeight: 1.55, background: colors.bg, borderRadius: radius.md, padding: "11px 14px", whiteSpace: "pre-wrap" }}>
          {String(a)}
        </div>
      ))}
    </div>
  );
}
