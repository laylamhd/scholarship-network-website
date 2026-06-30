import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/profiles";
import SurveyBuilder from "@/components/SurveyBuilder";
import { colors } from "@/lib/theme";

export default async function NewSurveyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "32px", width: "100%" }}>
      <Link href="/research?view=surveys" style={{ fontSize: 13.5, color: colors.brand, fontWeight: 600 }}>‹ Back to Dataset Surveys</Link>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: colors.ink, margin: "10px 0 4px" }}>Create a survey</h1>
      <p style={{ fontSize: 14.5, color: colors.inkFaint, margin: "0 0 22px" }}>
        Add your questions below. Once created, the questions are fixed and members can respond anonymously.
      </p>
      <SurveyBuilder />
    </div>
  );
}
