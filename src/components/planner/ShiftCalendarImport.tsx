"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { EmptyState, Field, LoadError } from "@/components/planner/ui";
import { createClient } from "@/lib/supabase/client";
import { intervalLabel } from "@/lib/planner";
import { MAX_CALENDAR_BYTES, readShiftCalendar, type CalendarShift } from "@/lib/shift-calendar";

export default function ShiftCalendarImport() {
  const router = useRouter();
  const [draft, setDraft] = useState<CalendarShift[] | null>(null);
  const [skipped, setSkipped] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [working, setWorking] = useState(false);

  async function preview(file?: File) {
    setDraft(null);
    setSkipped(0);
    setError("");
    setNotice("");
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".ics") || file.size > MAX_CALENDAR_BYTES) {
      setError("Choose an .ics file up to 1 MB.");
      return;
    }
    setWorking(true);
    try {
      const result = readShiftCalendar(await file.text());
      setDraft(result.shifts);
      setSkipped(result.skipped);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not read this calendar file.");
    } finally {
      setWorking(false);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const chosen = new Set(new FormData(event.currentTarget).getAll("shift"));
    const values = (draft ?? []).filter((shift) => chosen.has(shift.calendar_uid));
    setError("");
    setNotice("");
    if (!values.length) {
      setError("Select at least one shift.");
      return;
    }

    setWorking(true);
    try {
      const { data, error } = await createClient().from("work_shifts").upsert(values, {
        onConflict: "owner_id,calendar_uid", ignoreDuplicates: true, defaultToNull: false,
      }).select("id");
      if (error) throw error;
      const added = data?.length ?? 0;
      setNotice(added + " added, " + (values.length - added) + " already imported.");
      setDraft(null);
      router.refresh();
    } catch {
      setError("Could not import these shifts. Check your connection and try again.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="space-y-4">
      <Field label="Shift calendar (.ics)" help="Upload an export if your employer provides one. Only dated, timed shifts can be imported.">
        <input type="file" accept=".ics,text/calendar" className="control file:mr-3 file:text-sm file:font-semibold file:text-brand-800"
          disabled={working} onChange={(event) => void preview(event.target.files?.[0])} />
      </Field>
      {skipped > 0 && <p className="text-xs leading-5 text-slate-600">{skipped} entries skipped. Add recurring or untimed entries manually.</p>}
      {draft?.length === 0 && <EmptyState>No supported timed entries in this file.</EmptyState>}
      {!!draft?.length && (
        <form onSubmit={save}>
          <fieldset disabled={working} className="space-y-3">
            <legend className="mb-2 text-sm font-medium">Choose the shifts to add</legend>
            <div className="max-h-72 space-y-2 overflow-auto pr-1">
              {draft.map((shift) => (
                <label key={shift.calendar_uid} className="flex items-start gap-3 rounded-lg border border-brand-100 bg-brand-50/50 p-2.5 text-sm">
                  <input className="mt-1 accent-brand-700" name="shift" type="checkbox" value={shift.calendar_uid} defaultChecked />
                  <span className="min-w-0 break-words">
                    <span className="font-semibold">{shift.workplace}</span>
                    <span className="mt-1 block text-xs text-slate-700">{intervalLabel(shift.starts_at, shift.ends_at)}</span>
                  </span>
                </label>
              ))}
            </div>
            <button className="button-primary" type="submit" disabled={working}>{working ? "Importing…" : "Add selected shifts"}</button>
          </fieldset>
        </form>
      )}
      {error && <LoadError>{error}</LoadError>}
      {notice && <p className="feedback-ok" role="status">{notice}</p>}
    </div>
  );
}
