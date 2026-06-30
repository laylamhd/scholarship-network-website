import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/profiles";
import { getSurveyForRespond } from "@/lib/surveys";
import SurveyResponseForm from "@/components/SurveyResponseForm";
import { Icon } from "@/components/Icon";
import { colors, radius } from "@/lib/theme";

export default async function SurveyRespondPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const survey = await getSurveyForRespond(id, user.id);
  if (!survey) notFound();

  const isOwner = survey.author_id === user.id;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px", width: "100%" }}>
      <Link href="/research?view=surveys" style={{ fontSize: 13.5, color: colors.brand, fontWeight: 600 }}>‹ Dataset Surveys</Link>

      <h1 style={{ fontSize: 27, fontWeight: 800, color: colors.ink, margin: "14px 0 8px", lineHeight: 1.2 }}>{survey.title}</h1>
      {survey.description && (
        <p style={{ fontSize: 15, color: colors.inkMuted, lineHeight: 1.6, margin: "0 0 8px", whiteSpace: "pre-wrap" }}>{survey.description}</p>
      )}
      <div style={{ fontSize: 12.5, color: colors.inkFaint, display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 22 }}>
        <Icon name="user" size={14} /> {survey.author_name} · {survey.questions.length} question{survey.questions.length === 1 ? "" : "s"}
      </div>

      {isOwner ? (
        <Notice tone="brand" title="This is your survey">
          You can’t respond to your own survey. <Link href={`/surveys/${id}/results`} style={{ color: colors.brandDeep, fontWeight: 700 }}>View the results ›</Link>
        </Notice>
      ) : survey.i_responded ? (
        <Notice tone="green" title="You’ve already responded">
          Thanks — your anonymous response has been recorded.
        </Notice>
      ) : !survey.is_open ? (
        <Notice tone="muted" title="This survey is closed">
          The author is no longer collecting responses.
        </Notice>
      ) : survey.questions.length === 0 ? (
        <Notice tone="muted" title="No questions yet">
          This survey has no questions to answer.
        </Notice>
      ) : (
        <SurveyResponseForm surveyId={id} questions={survey.questions} />
      )}
    </div>
  );
}

function Notice({ tone, title, children }: { tone: "brand" | "green" | "muted"; title: string; children: React.ReactNode }) {
  const map = {
    brand: { bg: colors.tintBlue, border: colors.borderBlue, color: colors.brandDeep },
    green: { bg: "#E6F6F0", border: "#BFE6D6", color: "#0F8F6B" },
    muted: { bg: colors.bg, border: colors.border, color: colors.inkMuted },
  }[tone];
  return (
    <div style={{ background: map.bg, border: `1px solid ${map.border}`, borderRadius: radius.lg, padding: "22px 24px" }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: map.color, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 14, color: colors.inkMuted, lineHeight: 1.55 }}>{children}</div>
    </div>
  );
}
