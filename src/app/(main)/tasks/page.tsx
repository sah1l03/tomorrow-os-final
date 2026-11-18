import type { Metadata } from "next";
import TasksWorkspace from "@/components/planner/TasksWorkspace";
import { PageHeader, LoadError } from "@/components/planner/ui";
import { getPlanner } from "@/lib/planner-data";
import type { Task } from "@/lib/planner";

export const metadata: Metadata = { title: "Tasks" };

export default async function TasksPage() {
  const { supabase, userId } = await getPlanner();
  const { data, error } = await supabase.from("tasks")
    .select("id, title, due_date, due_time, priority, completed, visibility")
    .eq("owner_id", userId).order("completed").order("due_date", { nullsFirst: false }).order("created_at", { ascending: false });

  return (
    <div className="workspace workspace-split">
      <PageHeader addTarget="add-task" eyebrow="To-do list" title="Tasks" description="Keep track of what you need to get done. Add a due date whenever it helps." />
      {error ? <LoadError /> : <TasksWorkspace tasks={(data ?? []) as Task[]} />}
    </div>
  );
}
