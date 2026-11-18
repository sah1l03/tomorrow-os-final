import Link from "next/link";
import type { Metadata } from "next";
import ShareWorkspace from "@/components/planner/ShareWorkspace";
import { LoadError, PageHeader } from "@/components/planner/ui";
import { getPlanner, loadCourses, loadSchedule } from "@/lib/planner-data";
import { addDays, dateLabel, instantDate, todayDate, type CalendarShare, type ShareItem } from "@/lib/planner";

export const metadata: Metadata = { title: "Shared" };

export default async function SharedPage({ searchParams }: PageProps<"/shared">) {
  const [{ supabase, userId }, { conversation }] = await Promise.all([getPlanner(), searchParams]);
  const today = todayDate();
  const [shares, events, meetings, shifts, deadlines, tasks, incoming, courses, requests] = await Promise.all([
    supabase.from("calendar_shares").select("id, owner_id, viewer_id, owner_label, viewer_label, scope, categories, item_ids")
      .order("created_at", { ascending: false }),
    supabase.from("events").select("id, title, category, starts_at, visibility").eq("owner_id", userId).neq("visibility", "private"),
    supabase.from("class_meetings").select("id, course_id, label, visibility").eq("owner_id", userId).neq("visibility", "private"),
    supabase.from("work_shifts").select("id, workplace, starts_at, visibility").eq("owner_id", userId).neq("visibility", "private"),
    supabase.from("deadlines").select("id, course_id, title, due_date, visibility").eq("owner_id", userId).neq("visibility", "private"),
    supabase.from("tasks").select("id, title, due_date, visibility").eq("owner_id", userId).neq("visibility", "private").not("due_date", "is", null),
    loadSchedule(today, addDays(today, 14), "shared"),
    loadCourses(),
    supabase.from("calendar_activity").select("sender_id").eq("recipient_id", userId).eq("status", "pending"),
  ]);
  const owned = ((shares.data ?? []) as CalendarShare[]).filter((share) => share.owner_id === userId);
  const received = ((shares.data ?? []) as CalendarShare[]).filter((share) => share.viewer_id === userId);
  const codeFor = (id: string) => courses.courses.find((course) => course.id === id)?.code;
  const items: ShareItem[] = [
    ...(events.data ?? []).map((row) => ({ id: row.id, kind: row.category, title: row.title + " · " + dateLabel(instantDate(row.starts_at)), visibility: row.visibility })),
    ...(meetings.data ?? []).map((row) => ({ id: row.id, kind: "class", title: [codeFor(row.course_id), row.label].filter(Boolean).join(" · "), visibility: row.visibility } as const)),
    ...(shifts.data ?? []).map((row) => ({ id: row.id, kind: "work", title: row.workplace + " · " + dateLabel(instantDate(row.starts_at)), visibility: row.visibility } as const)),
    ...(deadlines.data ?? []).map((row) => ({ id: row.id, kind: "deadline", title: [codeFor(row.course_id), row.title, dateLabel(row.due_date)].filter(Boolean).join(" · "), visibility: row.visibility } as const)),
    ...(tasks.data ?? []).map((row) => ({ id: row.id, kind: "task", title: row.title + " · " + dateLabel(row.due_date), visibility: row.visibility } as const)),
  ];
  const error = [shares, events, meetings, shifts, deadlines, tasks, courses].some((query) => query.error);

  return (
    <div className="workspace workspace-split">
      <PageHeader eyebrow="Roommates" title="Shared calendars"
        description="See what friends share with you, compare schedules, and plan together."
        action={<Link prefetch={false} href="/calendar?scope=all" className="button-secondary">View together</Link>} />
      {error ? <LoadError /> : <ShareWorkspace owned={owned} received={received} items={items}
        incoming={incoming.entries} scheduleError={!!incoming.error} userId={userId}
        conversation={typeof conversation === "string" ? conversation : ""}
        pendingFrom={(requests.data ?? []).map((request) => request.sender_id as string)} threadError={!!requests.error} />}
    </div>
  );
}
