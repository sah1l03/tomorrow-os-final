import type { Metadata } from "next";
import WorkWorkspace from "@/components/planner/WorkWorkspace";
import { PageHeader, LoadError } from "@/components/planner/ui";
import { getPlanner } from "@/lib/planner-data";
import type { WorkShift } from "@/lib/planner";

export const metadata: Metadata = { title: "Work" };

export default async function WorkPage() {
  const { supabase, userId } = await getPlanner();
  const { data, error } = await supabase.from("work_shifts")
    .select("id, workplace, starts_at, ends_at, repeat_until, repeat_every_weeks, location, notes, visibility")
    .eq("owner_id", userId).order("starts_at", { ascending: false });

  return (
    <div className="workspace workspace-split">
      <PageHeader addTarget="add-shift" eyebrow="Work schedule" title="Work shifts" description="Add a single shift, repeat it on the same weekday, or review a shift calendar export." />
      {error ? <LoadError /> : <WorkWorkspace shifts={(data ?? []) as WorkShift[]} />}
    </div>
  );
}
