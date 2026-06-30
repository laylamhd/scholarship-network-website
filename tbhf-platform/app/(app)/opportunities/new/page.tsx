import Link from "next/link";
import { redirect } from "next/navigation";
import { getMyRole } from "@/lib/profiles";
import { getOpportunityTypes } from "@/lib/opportunities";
import OpportunityForm from "@/components/OpportunityForm";
import { colors } from "@/lib/theme";

export default async function NewOpportunityPage() {
  const role = await getMyRole();
  if (role !== "admin") redirect("/opportunities");

  const types = await getOpportunityTypes();

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px", width: "100%" }}>
      <Link href="/opportunities" style={{ fontSize: 14, color: colors.inkMuted, fontWeight: 600 }}>‹ Career Center</Link>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: colors.ink, margin: "10px 0 6px" }}>Post an opportunity</h1>
      <p style={{ fontSize: 14.5, color: colors.inkFaint, margin: "0 0 22px" }}>
        Share an internship, fellowship, graduate program or job with scholars.
      </p>
      <OpportunityForm types={types} />
    </div>
  );
}
