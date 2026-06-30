import { redirect } from "next/navigation";
import ProfileView from "@/components/ProfileView";
import { getMyFullProfile } from "@/lib/profiles";

export default async function MyProfilePage() {
  const data = await getMyFullProfile();
  if (!data) redirect("/login");
  return <ProfileView data={data} isOwn />;
}
