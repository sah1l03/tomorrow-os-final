"use client";

import { useState, type FormEvent } from "react";
import ShiftCalendarImport from "@/components/planner/ShiftCalendarImport";
import { DeleteRecord, FormActions, useSaveRecord } from "@/components/planner/mutations";
import { CategoryBadge, EditorRail, EditorResults, EmptyState, Field, Panel, VisibilityField } from "@/components/planner/ui";
import {
  VISIBILITIES, addDays, dateLabel, datedInterval, field, instantDate, isDate, localInput,
  visibilityField, wallInstant, type WorkShift,
} from "@/lib/planner";

export function ShiftForm({ initial, draftDate, onClose, onSaved }: {
  initial?: WorkShift; draftDate?: string; onClose?: () => void; onSaved?: () => void;
}) {
  const { save, saving, error, setError, notice } = useSaveRecord("work_shifts");
  const [repeat, setRepeat] = useState(initial?.repeat_until ? String(initial.repeat_every_weeks) : "0");
  const [startDate, startTime] = initial ? localInput(initial.starts_at).split("T") : [draftDate ?? "", ""];
  const endTime = initial ? localInput(initial.ends_at).split("T")[1] : "";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    try {
      const workplace = field(fields, "workplace");
      const date = field(fields, "date");
      const start = field(fields, "start_time");
      const end = field(fields, "end_time");
      const repeat_until = repeat !== "0" ? field(fields, "repeat_until") : null;
      if (!workplace) throw new Error("Enter your workplace.");
      if (!isDate(date)) throw new Error("Choose the date the shift starts.");
      const sameTimes = !!initial && date === startDate && start === startTime && end === endTime;
      if (!sameTimes && start === end) throw new Error("Start and end time must be different.");
      if (repeat_until !== null && (!isDate(repeat_until) || repeat_until < date)) {
        throw new Error("Choose a repeat end date on or after the shift date.");
      }
      const starts_at = sameTimes ? initial.starts_at : wallInstant(date, start);
      const ends_at = sameTimes ? initial.ends_at : wallInstant(end < start ? addDays(date, 1) : date, end);
      if (new Date(ends_at) <= new Date(starts_at)) throw new Error("The shift must end after it starts.");
      if (await save({
        workplace, starts_at, ends_at, repeat_until, repeat_every_weeks: Number(repeat) || 1,
        location: field(fields, "location"), notes: field(fields, "notes"), visibility: visibilityField(fields),
      }, initial?.id)) {
        if (!initial) {
          form.reset();
          setRepeat("0");
        }
        onSaved?.();
        onClose?.();
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Check the shift details.");
    }
  }

  return (
    <form onSubmit={submit}>
      <fieldset className="space-y-4" disabled={saving}>
        <Field label="Workplace">
          <input className="control" name="workplace" required maxLength={200} defaultValue={initial?.workplace} placeholder="Atlantic Superstore" />
        </Field>
        <Field label="Shift date">
          <input className="control" name="date" type="date" required defaultValue={startDate} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Start time"><input className="control" name="start_time" type="time" required defaultValue={startTime} /></Field>
          <Field label="End time"><input className="control" name="end_time" type="time" required defaultValue={endTime} /></Field>
        </div>
        <p className="text-xs leading-5 text-slate-600">Times are Halifax time. If the end time is earlier, the shift ends the next day.</p>
        <Field label="Repeat"><select className="control" value={repeat} onChange={(event) => setRepeat(event.target.value)}>
          <option value="0">Does not repeat</option><option value="1">Every week</option><option value="2">Every other week</option>
        </select></Field>
        {repeat !== "0" && <Field label="Repeat through">
          <input className="control" name="repeat_until" type="date" required defaultValue={initial?.repeat_until ?? ""} />
        </Field>}
        <Field label="Location (optional)"><input className="control" name="location" maxLength={200} defaultValue={initial?.location} /></Field>
        <Field label="Notes (optional)"><textarea className="control" name="notes" maxLength={2000} rows={2} defaultValue={initial?.notes} /></Field>
        <VisibilityField value={initial?.visibility} />
        <FormActions saving={saving} error={error} notice={notice} editing={!!initial} onCancel={onClose} label="Add shift" />
      </fieldset>
    </form>
  );
}

export default function WorkWorkspace({ shifts }: { shifts: WorkShift[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const stopEditing = () => setEditing(null);

  return (
    <div className="editor-grid">
      <EditorRail id="add-shift">
        <Panel title="Add a shift"><ShiftForm /></Panel>
        <Panel title="Import a shift calendar"><ShiftCalendarImport /></Panel>
      </EditorRail>
      <EditorResults label="Shift list">
        <Panel stickyHeading title="Saved shifts" caption="Repeating shifts appear on the calendar as separate occurrences.">
          {!shifts.length && <EmptyState>Add or import your first shift to see it here.</EmptyState>}
          <div className="space-y-3">
            {shifts.map((shift) => (
              <article key={shift.id} className="record" id={"shift-" + shift.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <CategoryBadge kind="work" />
                  {instantDate(shift.starts_at) !== instantDate(shift.ends_at) && <span className="text-xs font-medium text-slate-600">Overnight</span>}
                </div>
                <h3 className="mt-2 break-words font-semibold">{shift.workplace}</h3>
                <p className="mt-1 text-sm text-slate-700">{datedInterval(shift.starts_at, shift.ends_at)}</p>
                <p className="mt-1 text-xs text-slate-600">
                  {shift.repeat_until ? (shift.repeat_every_weeks === 2 ? "Every other week" : "Weekly") +
                    " through " + dateLabel(shift.repeat_until) + " · " : ""}{VISIBILITIES[shift.visibility]}
                </p>
                {shift.location && <p className="mt-1 text-xs text-slate-600">{shift.location}</p>}
                {editing === shift.id ? <div className="mt-4"><ShiftForm initial={shift} onClose={stopEditing} /></div> : (
                  <div className="mt-3 flex flex-wrap gap-1">
                    <button type="button" className="button-quiet text-brand-800" onClick={() => setEditing(shift.id)}>Edit</button>
                    <DeleteRecord table="work_shifts" id={shift.id} question="Delete this shift and any repeats?" />
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
