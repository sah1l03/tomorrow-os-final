import { Field } from "@/components/planner/ui";
import { isDate, isTime } from "@/lib/planner";

export default function DueFields({ date, time, prefix = "", required = false }: {
  date?: string | null; time?: string | null; prefix?: string; required?: boolean;
}) {
  const minute = time?.slice(0, 5) ?? "";
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label={required ? "Due date" : "Due date (optional)"}>
        <input className="control" name={prefix + "due_date"} type="date" required={required}
          defaultValue={date && isDate(date) ? date : ""} />
      </Field>
      <Field label="Due time (optional)">
        <input className="control" name={prefix + "due_time"} type="time" defaultValue={isTime(minute) ? minute : ""} />
      </Field>
    </div>
  );
}
