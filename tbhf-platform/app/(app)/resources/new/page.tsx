import Link from "next/link";
import { redirect } from "next/navigation";
import { getMyRole } from "@/lib/profiles";
import { getMyCapabilities } from "@/lib/admin";
import { listCategories, getResourceTypes } from "@/lib/resources";
import ResourceForm from "@/components/ResourceForm";
import { colors } from "@/lib/theme";

export default async function NewResourcePage() {
  const role = await getMyRole();
  const caps = role === "admin" ? [] : await getMyCapabilities();
  if (role !== "admin" && !caps.includes("manage_events_resources")) redirect("/resources");

  const [categories, types] = await Promise.all([listCategories(), getResourceTypes()]);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px", width: "100%" }}>
      <Link href="/resources" style={{ fontSize: 14, color: colors.inkMuted, fontWeight: 600 }}>‹ Resource Library</Link>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: colors.ink, margin: "10px 0 6px" }}>Add a resource</h1>
      <p style={{ fontSize: 14.5, color: colors.inkFaint, margin: "0 0 22px" }}>
        Publish a study guide, template, course or link to the library.
      </p>
      <ResourceForm categories={categories} types={types} />
    </div>
  );
}
