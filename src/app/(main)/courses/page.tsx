import Link from "next/link";
import type { Metadata } from "next";
import CoursesWorkspace from "@/components/planner/CoursesWorkspace";
import Icon from "@/components/planner/Icon";
import { LoadError, PageHeader } from "@/components/planner/ui";
import { getPlanner, loadCourses } from "@/lib/planner-data";
import type { ClassMeeting } from "@/lib/planner";

export const metadata: Metadata = { title: "Courses" };

export default async function CoursesPage() {
  const { supabase, userId } = await getPlanner();
  const [{ courses, error }, meetings] = await Promise.all([
    loadCourses(),
    supabase.from("class_meetings")
      .select("id, course_id, label, weekdays, start_time, end_time, start_date, end_date, repeat_every_weeks, excluded_dates, location, notes, visibility, source_name, source_page")
      .eq("owner_id", userId).order("start_time"),
  ]);

  return (
    <div className="workspace workspace-split">
      <PageHeader addTarget="add-course" eyebrow="Academics" title="Courses" description="Manage lectures, labs, and tutorials. Repeating classes appear on your calendar."
        action={<Link prefetch={false} className="button-primary" href="/import"><Icon name="import" className="size-4" /><span className="hidden sm:inline">Import syllabus</span><span className="sm:hidden">Import</span></Link>} />
      {error || meetings.error ? <LoadError /> : <CoursesWorkspace courses={courses} meetings={(meetings.data ?? []) as ClassMeeting[]} />}
    </div>
  );
}
