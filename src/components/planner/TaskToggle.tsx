"use client";

import { useSaveRecord } from "@/components/planner/mutations";
import { useCelebrate } from "@/components/planner/Celebration";
import Icon from "@/components/planner/Icon";
import type { Task } from "@/lib/planner";

export default function TaskToggle({ task, compact = false }: { task: Pick<Task, "id" | "title" | "completed">; compact?: boolean }) {
  const { save, saving, error } = useSaveRecord("tasks");
  const celebrate = useCelebrate();
  async function toggle() {
    if (await save({ completed: !task.completed }, task.id) && !task.completed) {
      celebrate("Task complete!", task.title);
    }
  }
  return (
    <div className="shrink-0">
      <button type="button" aria-label={task.completed ? "Reopen " + task.title : "Complete " + task.title}
        title={task.completed ? "Reopen task" : "Mark complete"} disabled={saving}
        aria-pressed={task.completed} onClick={toggle}
        className={compact ? "tos-check" : "grid size-8 place-items-center rounded-lg border transition disabled:opacity-50 " +
          (task.completed ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-brand-200 bg-white text-brand-700 hover:bg-brand-100")}>
        {(!compact || task.completed) && <Icon name="check" className="size-4" />}
      </button>
      {error && <p role="alert" className="mt-1 max-w-32 text-xs text-rose-800">{error}</p>}
    </div>
  );
}
