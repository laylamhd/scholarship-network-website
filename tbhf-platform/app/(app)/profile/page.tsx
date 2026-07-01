import { redirect } from "next/navigation";
import ProfileView from "@/components/ProfileView";
import { getMyFullProfile, isProfileModerator } from "@/lib/profiles";

export default async function MyProfilePage() {
  const data = await getMyFullProfile();
  if (!data) redirect("/login");
  const moderator = await isProfileModerator(data.profile.id);
  return <ProfileView data={data} isOwn isModerator={moderator} />;
}
