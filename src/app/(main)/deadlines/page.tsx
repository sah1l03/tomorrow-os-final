import Link from "next/link";
import type { Metadata } from "next";
import DeadlinesWorkspace from "@/components/planner/DeadlinesWorkspace";
import { PageHeader, LoadError } from "@/components/planner/ui";
import Icon from "@/components/planner/Icon";
import { getPlanner, loadCourses } from "@/lib/planner-data";
import { localInput, type Deadline } from "@/lib/planner";

export const metadata: Metadata = { title: "Deadlines" };

export default async function DeadlinesPage() {
  const { supabase, userId, now } = await getPlanner();
  const [{ courses, error }, deadlines] = await Promise.all([
    loadCourses(),
    supabase.from("deadlines").select("id, course_id, title, kind, due_date, due_time, status, visibility, source_name, source_page")
      .eq("owner_id", userId).order("due_date").order("due_time", { nullsFirst: false }),
  ]);

  return (
    <div className="workspace workspace-split">
      <PageHeader addTarget="add-deadline" eyebrow="Academics" title="Deadlines" description="See what’s due and track each assessment from start to finish."
        action={<Link prefetch={false} className="button-secondary" href="/import"><Icon name="import" className="size-4" /><span className="hidden sm:inline">Import syllabus</span><span className="sm:hidden">Import</span></Link>} />
      {error || deadlines.error ? <LoadError /> :
        <DeadlinesWorkspace courses={courses} deadlines={(deadlines.data ?? []) as Deadline[]} now={localInput(now)} />}
    </div>
  );
}
