"use client";

import type { FormEvent } from "react";
import { Field } from "@/components/planner/ui";
import { FormActions, useSaveRecord } from "@/components/planner/mutations";
import { field, type Course } from "@/lib/planner";

export default function CourseForm({ initial, onCancel, onSaved }: {
  initial?: Course; onCancel?: () => void; onSaved?: () => void;
}) {
  const { save, saving, error, setError, notice } = useSaveRecord("courses");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const code = field(values, "code").toUpperCase();
    const name = field(values, "name");
    if (!code || !name) {
      setError("Enter a course code and name.");
      return;
    }
    if (await save({ code, name }, initial?.id)) {
      if (!initial) form.reset();
      onSaved?.();
    }
  }

  return (
    <form onSubmit={submit}>
      <fieldset disabled={saving} className="space-y-4">
        <Field label="Course code">
          <input className="control" name="code" required maxLength={30}
            defaultValue={initial?.code} placeholder="CSCI 2100" />
        </Field>
        <Field label="Course name">
          <input className="control" name="name" required maxLength={200}
            defaultValue={initial?.name} placeholder="Course name" />
        </Field>
        <FormActions saving={saving} error={error} notice={notice} label="Add course"
          editing={!!initial} onCancel={onCancel} />
      </fieldset>
    </form>
  );
}
