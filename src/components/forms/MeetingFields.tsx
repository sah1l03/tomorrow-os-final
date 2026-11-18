import { Field } from "@/components/planner/ui";
import { WEEKDAYS, isDate, isTime, type MeetingValues } from "@/lib/planner";

type MeetingDraft = { [Key in keyof MeetingValues]?: MeetingValues[Key] | null };

export default function MeetingFields({ initial, prefix = "", required = true }: {
  initial?: MeetingDraft; prefix?: string; required?: boolean;
}) {
  const dateValue = (value?: string | null) => value && isDate(value) ? value : "";
  const timeValue = (value?: string | null) => value && isTime(value.slice(0, 5)) ? value.slice(0, 5) : "";

  return (
    <div className="space-y-4">
      <Field label="Meeting name">
        <input name={prefix + "label"} required={required} maxLength={120} className="control"
          defaultValue={initial?.label ?? ""} placeholder="Lecture, Lab 01, or Tutorial" />
      </Field>
      <fieldset>
        <legend className="text-sm font-medium">Class days</legend>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {WEEKDAYS.map(([value, label]) => (
            <label key={value} className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium has-checked:border-brand-400 has-checked:bg-brand-50">
              <input className="accent-brand-700" type="checkbox" name={prefix + "weekdays"}
                value={value} defaultChecked={initial?.weekdays?.includes(value)} />{label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Start time"><input name={prefix + "start_time"} type="time" required={required} className="control"
          defaultValue={timeValue(initial?.start_time)} /></Field>
        <Field label="End time"><input name={prefix + "end_time"} type="time" required={required} className="control"
          defaultValue={timeValue(initial?.end_time)} /></Field>
        <Field label="First date"><input name={prefix + "start_date"} type="date" required={required} className="control"
          defaultValue={dateValue(initial?.start_date)} /></Field>
        <Field label="Last date"><input name={prefix + "end_date"} type="date" required={required} className="control"
          defaultValue={dateValue(initial?.end_date)} /></Field>
        <Field label="Repeats">
          <select name={prefix + "repeat_every_weeks"} required={required} className="control"
            defaultValue={initial?.repeat_every_weeks ?? ""}>
            <option value="">Choose frequency</option>
            <option value="1">Every week</option>
            <option value="2">Every other week</option>
          </select>
        </Field>
        <Field label="Location (optional)"><input name={prefix + "location"} className="control"
          defaultValue={initial?.location ?? ""} placeholder="CS 127" maxLength={200} /></Field>
      </div>
      <p className="text-xs leading-5 text-slate-600">For every other week, choose one weekday and use the first actual meeting date.</p>
      <details className="rounded-lg border border-slate-200 px-3 py-2.5" open={!!(initial?.excluded_dates?.length || initial?.notes) || undefined}>
        <summary className="cursor-pointer text-sm font-medium">Skipped dates and notes</summary>
        <div className="mt-3 space-y-3">
          <Field label="Skipped dates" help="Enter YYYY-MM-DD dates separated by commas or new lines.">
            <textarea name={prefix + "excluded_dates"} className="control" rows={2}
              defaultValue={initial?.excluded_dates?.join(", ")} maxLength={3000} />
          </Field>
          <Field label="Notes"><textarea name={prefix + "notes"} className="control" rows={2}
            defaultValue={initial?.notes ?? ""} maxLength={2000} /></Field>
        </div>
      </details>
    </div>
  );
}
