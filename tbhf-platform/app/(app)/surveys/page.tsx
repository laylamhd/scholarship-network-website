import { redirect } from "next/navigation";

// Surveys now live inside the Research Hub as the "Dataset Surveys" tab.
export default async function SurveysPage({
  searchParams,
}: {
  searchParams: Promise<{ mine?: string }>;
}) {
  const { mine } = await searchParams;
  redirect(mine === "1" ? "/research?view=surveys&mine=1" : "/research?view=surveys");
}
