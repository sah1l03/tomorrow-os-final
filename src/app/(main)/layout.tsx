import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { appearanceCookie, readLook } from "@/lib/appearance";
import Sidebar from "@/components/layout/Sidebar";
import { WorkspaceFrame } from "@/components/layout/WorkspaceMotion";
import CelebrationProvider from "@/components/planner/Celebration";
import { getPlanner } from "@/lib/planner-data";
import { loadProfile } from "@/lib/profile-data";

export default async function MainLayout({ children }: { children: ReactNode }) {
  const [{ email }, { profile }, preferences] = await Promise.all([getPlanner(), loadProfile(), cookies()]);
  return (
    <CelebrationProvider>
      <WorkspaceFrame initialLook={readLook(preferences.get(appearanceCookie)?.value)}>
        <Sidebar email={email} profile={profile} />
        <main className="planner-main min-w-0 p-4 sm:p-6 lg:px-8 lg:py-5">{children}</main>
      </WorkspaceFrame>
    </CelebrationProvider>
  );
}
