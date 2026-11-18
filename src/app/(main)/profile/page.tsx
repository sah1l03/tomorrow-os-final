import type { Metadata } from "next";
import { LoadError, PageHeader } from "@/components/planner/ui";
import ProfileEditor from "@/components/profile/ProfileEditor";
import { getPlanner } from "@/lib/planner-data";
import { loadProfile } from "@/lib/profile-data";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const [{ email, userId }, { profile, error }] = await Promise.all([getPlanner(), loadProfile()]);
  return (
    <div className="workspace">
      <PageHeader eyebrow="Account" title="Profile" description="Choose the username and picture you see in the sidebar." />
      {error ? <LoadError>Could not load your profile. Refresh and try again.</LoadError>
        : <ProfileEditor initial={profile} email={email} userId={userId} />}
    </div>
  );
}
