import { notFound } from "next/navigation";
import ProfileView from "@/components/ProfileView";
import { getFullProfile, getCurrentUser, isProfileModerator } from "@/lib/profiles";
import { isFollowing } from "@/lib/community";

export default async function ScholarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [data, user] = await Promise.all([getFullProfile(id), getCurrentUser()]);

  // RLS returns null if the profile is private and not the viewer's own.
  if (!data) notFound();

  const isOwn = user?.id === data.profile.id;
  const [following, moderator] = await Promise.all([
    !isOwn && user ? isFollowing(user.id, id) : Promise.resolve(false),
    isProfileModerator(id),
  ]);

  return <ProfileView data={data} isOwn={isOwn} isFollowing={following} isModerator={moderator} />;
}
