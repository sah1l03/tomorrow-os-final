"use client";

import { useState, type FormEvent } from "react";
import DueFields from "@/components/forms/DueFields";
import TaskToggle from "@/components/planner/TaskToggle";
import { DeleteRecord, FormActions, useSaveRecord } from "@/components/planner/mutations";
import { CategoryBadge, EditorRail, EditorResults, EmptyState, Field, Panel, VisibilityField } from "@/components/planner/ui";
import { PRIORITIES, VISIBILITIES, dateLabel, field, validateDue, visibilityField, wallClock, type Priority, type Task } from "@/lib/planner";

export function TaskForm({ initial, onClose, onSaved }: { initial?: Task; onClose?: () => void; onSaved?: () => void }) {
  const { save, saving, error, setError, notice } = useSaveRecord("tasks");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    try {
      const title = field(fields, "title");
      const priority = field(fields, "priority") as Priority;
      const due_date = field(fields, "due_date");
      const due_time = field(fields, "due_time");
      if (!title || !PRIORITIES.includes(priority)) throw new Error("Enter a task title and choose a priority.");
      validateDue(due_date, due_time, false);
      if (await save({ title, priority, due_date: due_date || null, due_time: due_time || null, visibility: visibilityField(fields) }, initial?.id)) {
        if (!initial) form.reset();
        onSaved?.();
        onClose?.();
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Check the task details.");
    }
  }

  return (
    <form onSubmit={submit}>
      <fieldset className="space-y-4" disabled={saving}>
        <Field label="Task title"><input className="control" name="title" required maxLength={200}
          defaultValue={initial?.title} placeholder="Review lecture notes" /></Field>
        <DueFields date={initial?.due_date} time={initial?.due_time} />
        <Field label="Priority"><select className="control" name="priority" defaultValue={initial?.priority ?? "normal"}>
          <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option>
        </select></Field>
        <VisibilityField value={initial?.visibility} />
        <FormActions saving={saving} error={error} notice={notice} editing={!!initial} onCancel={onClose} label="Add task" />
      </fieldset>
    </form>
  );
}

export default function TasksWorkspace({ tasks }: { tasks: Task[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const stopEditing = () => setEditing(null);

  return (
    <div className="editor-grid">
      <EditorRail id="add-task">
        <Panel title="Add a task" caption="Tasks with dates also appear on your calendar."><TaskForm /></Panel>
      </EditorRail>
      <EditorResults label="Task list">
        <Panel stickyHeading title="Your tasks" caption={tasks.filter((task) => !task.completed).length + " open"}>
          {!tasks.length && <EmptyState>No tasks yet. Add something you want to get done.</EmptyState>}
          <div className="space-y-3">
            {tasks.map((task) => (
              <article key={task.id} className="record" id={"task-" + task.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <CategoryBadge kind="task" />
                      <span className={"text-xs font-semibold capitalize " + (task.priority === "high" ? "text-rose-800" : "text-slate-600")}>{task.priority} priority</span>
                      {task.completed && <span className="text-xs font-semibold text-emerald-800">Completed</span>}
                    </div>
                    <h3 className={"mt-2 break-words font-semibold " + (task.completed ? "text-slate-600 line-through" : "")}>{task.title}</h3>
                    <p className="mt-1 text-sm text-slate-700">
                      {task.due_date ? dateLabel(task.due_date, { month: "short", day: "numeric", year: "numeric" }) : "No due date"}
                      {task.due_time ? " · " + wallClock(task.due_time) : ""}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">{VISIBILITIES[task.visibility]}</p>
                  </div>
                  <TaskToggle task={task} />
                </div>
                {editing === task.id ? <div className="mt-4"><TaskForm initial={task} onClose={stopEditing} /></div> : (
                  <div className="mt-3 flex flex-wrap gap-1">
                    <button type="button" className="button-quiet text-brand-800" onClick={() => setEditing(task.id)}>Edit</button>
                    <DeleteRecord table="tasks" id={task.id} question="Delete this task?" />
                  </div>
                )}
              </article>
            ))}
          </div>
        </Panel>
      </EditorResults>
    </div>
  );
}
