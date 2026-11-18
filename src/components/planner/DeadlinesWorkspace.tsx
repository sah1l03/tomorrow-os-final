"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import DueFields from "@/components/forms/DueFields";
import { useCelebrate } from "@/components/planner/Celebration";
import { DeleteRecord, FormActions, useSaveRecord } from "@/components/planner/mutations";
import { CategoryBadge, EditorRail, EditorResults, EmptyState, Field, Panel, VisibilityField } from "@/components/planner/ui";
import {
  DEADLINE_KINDS, DEADLINE_STATUSES, VISIBILITIES, dateLabel, field, validateDue, visibilityField, wallClock,
  type Course, type Deadline, type DeadlineKind, type DeadlineStatus,
} from "@/lib/planner";

function completionLabel(kind: DeadlineKind) {
  return (kind === "other" ? "Deadline" : kind[0].toUpperCase() + kind.slice(1)) + " complete!";
}

export function DeadlineForm({ courses, initial, draftDate, onClose, onSaved }: {
  courses: Course[]; initial?: Deadline; draftDate?: string; onClose?: () => void; onSaved?: () => void;
}) {
  const { save, saving, error, setError, notice } = useSaveRecord("deadlines");
  const celebrate = useCelebrate();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    try {
      const title = field(fields, "title");
      const course_id = field(fields, "course_id");
      const kind = field(fields, "kind") as DeadlineKind;
      const status = field(fields, "status") as DeadlineStatus;
      const due_date = field(fields, "due_date");
      const due_time = field(fields, "due_time");
      if (!title || !courses.some((course) => course.id === course_id)) throw new Error("Enter a title and choose a course.");
      if (!DEADLINE_KINDS.includes(kind) || !Object.hasOwn(DEADLINE_STATUSES, status)) {
        throw new Error("Choose a type and status.");
      }
      validateDue(due_date, due_time, true);
      if (await save({ title, course_id, kind, status, due_date, due_time: due_time || null, visibility: visibilityField(fields) }, initial?.id)) {
        if (status === "completed" && initial?.status !== "completed") celebrate(completionLabel(kind), title);
        if (!initial) form.reset();
        onSaved?.();
        onClose?.();
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Check the deadline details.");
    }
  }

  return (
    <form onSubmit={submit}>
      <fieldset className="space-y-4" disabled={saving}>
        <Field label="Title"><input className="control" name="title" required maxLength={200}
          defaultValue={initial?.title} placeholder="Assignment 1" /></Field>
        <Field label="Course">
          <select className="control" name="course_id" required defaultValue={initial?.course_id ?? ""}>
            <option value="" disabled>Choose a course</option>
            {courses.map(({ id, code, name }) => <option key={id} value={id}>{code} · {name}</option>)}
          </select>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Type">
            <select className="control capitalize" name="kind" defaultValue={initial?.kind ?? "assignment"}>
              {DEADLINE_KINDS.map((kind) => <option key={kind} value={kind}>{kind[0].toUpperCase() + kind.slice(1)}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select className="control" name="status" defaultValue={initial?.status ?? "not_started"}>
              {Object.entries(DEADLINE_STATUSES).map(([key, name]) => <option key={key} value={key}>{name}</option>)}
            </select>
          </Field>
        </div>
        <DueFields required date={initial?.due_date ?? draftDate} time={initial?.due_time} />
        <VisibilityField value={initial?.visibility} />
        <FormActions saving={saving} error={error} notice={notice} editing={!!initial}
          onCancel={onClose} label="Add deadline" />
      </fieldset>
    </form>
  );
}

function CompleteDeadline({ deadline }: { deadline: Deadline }) {
  const { save, saving, error } = useSaveRecord("deadlines");
  const celebrate = useCelebrate();
  const completed = deadline.status === "completed";
  async function toggle() {
    if (await save({ status: completed ? "not_started" : "completed" }, deadline.id) && !completed) {
      celebrate(completionLabel(deadline.kind), deadline.title);
    }
  }
  return (
    <div>
      <button type="button" className="button-quiet text-brand-800" disabled={saving}
        onClick={toggle}>
        {saving ? "Saving…" : completed ? "Reopen" : "Mark complete"}
      </button>
      {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
    </div>
  );
}

export default function DeadlinesWorkspace({ courses, deadlines, now }: { courses: Course[]; deadlines: Deadline[]; now: string }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const filtered = deadlines.filter((row) => filter === "all" || (filter === "completed" ? row.status === "completed" : row.status !== "completed"));
  const stopEditing = () => setEditing(null);

  return (
    <div className="editor-grid">
      <EditorRail id="add-deadline">
        <Panel title="Add a deadline" caption="Due times are in Halifax time. Leave time blank if it’s unknown.">
          {courses.length ? <DeadlineForm courses={courses} /> :
            <EmptyState><Link prefetch={false} className="font-semibold text-brand-800 underline" href="/courses">Add a course</Link> before creating a deadline.</EmptyState>}
        </Panel>
      </EditorRail>
      <EditorResults label="Deadline list">
        <Panel stickyHeading title="Your deadlines" caption="Assignments, labs, quizzes, tests, and exams."
          action={<label className="text-xs font-semibold text-slate-600">Show
            <select className="control mt-1" value={filter} onChange={(event) => setFilter(event.target.value)}>
              <option value="open">Open</option><option value="completed">Completed</option><option value="all">All</option>
            </select>
          </label>}>
          {!filtered.length && <EmptyState>{filter === "open" ? "No open deadlines." : "No deadlines in this view."}</EmptyState>}
          <div className="space-y-3">
            {filtered.map((deadline) => (
              <article key={deadline.id} id={"deadline-" + deadline.id} className="record">
                <div className="flex flex-wrap items-center gap-2">
                  <CategoryBadge kind="deadline" />
                  <span className="text-xs font-medium capitalize text-slate-600">
                    {courses.find((course) => course.id === deadline.course_id)?.code} · {deadline.kind}
                  </span>
                  {deadline.status !== "completed" && (deadline.due_date < now.slice(0, 10) ||
                    (deadline.due_date === now.slice(0, 10) && deadline.due_time && deadline.due_time.slice(0, 5) < now.slice(11, 16))) &&
                    <span className="text-xs font-semibold text-rose-800">Overdue</span>}
                </div>
                <h3 className="mt-2 font-semibold">{deadline.title}</h3>
                <p className="mt-1 text-sm text-slate-700">
                  {dateLabel(deadline.due_date, { month: "short", day: "numeric", year: "numeric" })}
                  {" · "}{deadline.due_time ? wallClock(deadline.due_time) : "No time set"}
                </p>
                <p className="mt-1 text-xs text-slate-600">{DEADLINE_STATUSES[deadline.status]} · {VISIBILITIES[deadline.visibility]}</p>
                {deadline.source_name && <p className="mt-1 break-all text-xs text-slate-600">
                  From {deadline.source_name}{deadline.source_page ? ", p. " + deadline.source_page : ""}
                </p>}
                {editing === deadline.id ? (
                  <div className="mt-4"><DeadlineForm courses={courses} initial={deadline} onClose={stopEditing} /></div>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-1">
                    <CompleteDeadline deadline={deadline} />
                    <button type="button" className="button-quiet text-brand-800" onClick={() => setEditing(deadline.id)}>Edit</button>
                    <DeleteRecord table="deadlines" id={deadline.id} question="Delete this deadline?" />
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
