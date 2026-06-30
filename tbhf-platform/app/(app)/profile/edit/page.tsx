import { redirect } from "next/navigation";
import ProfileEditForm from "@/components/ProfileEditForm";
import { getMyFullProfile, getEnumValues } from "@/lib/profiles";

export default async function EditProfilePage() {
  const [data, visibilityValues, degreeLevels] = await Promise.all([
    getMyFullProfile(),
    getEnumValues("visibility_level"),
    getEnumValues("degree_level"),
  ]);
  if (!data) redirect("/login");

  return (
    <ProfileEditForm
      data={data}
      visibilityValues={visibilityValues.length ? visibilityValues : ["public", "private"]}
      degreeLevels={degreeLevels}
    />
  );
}
