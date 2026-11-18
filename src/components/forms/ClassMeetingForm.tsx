"use client";

import type { FormEvent } from "react";
import MeetingFields from "@/components/forms/MeetingFields";
import { Field, VisibilityField, EmptyState } from "@/components/planner/ui";
import { FormActions, useSaveRecord } from "@/components/planner/mutations";
import { field, readMeeting, visibilityField, type ClassMeeting, type Course } from "@/lib/planner";

export default function ClassMeetingForm({ courses, initial, onCancel, onSaved }: {
  courses: Course[]; initial?: ClassMeeting; onCancel?: () => void; onSaved?: () => void;
}) {
  const { save, saving, error, setError, notice } = useSaveRecord("class_meetings");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    try {
      const course_id = field(fields, "course_id");
      if (!courses.some((course) => course.id === course_id)) throw new Error("Choose a course.");
      if (await save({ ...readMeeting(fields), course_id, visibility: visibilityField(fields) }, initial?.id)) {
        if (!initial) form.reset();
        onSaved?.();
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Check the meeting details.");
    }
  }

  if (!courses.length) return <EmptyState>Add a course before adding a meeting.</EmptyState>;

  return (
    <form onSubmit={submit}>
      <fieldset disabled={saving} className="space-y-4">
        <Field label="Course">
          <select className="control" name="course_id" required defaultValue={initial?.course_id ?? ""}>
            <option value="" disabled>Choose a course</option>
            {courses.map((course) => <option value={course.id} key={course.id}>{course.code} · {course.name}</option>)}
          </select>
        </Field>
        <MeetingFields initial={initial ?? { repeat_every_weeks: 1, label: "Class" }} />
        <VisibilityField value={initial?.visibility} />
        <FormActions saving={saving} error={error} notice={notice} label="Add meeting"
          editing={!!initial} onCancel={onCancel} />
      </fieldset>
    </form>
  );
}
