"use client";

import { useId, useState, type FormEvent } from "react";
import { Field, VisibilityField } from "@/components/planner/ui";
import { FormActions, useSaveRecord } from "@/components/planner/mutations";
import { field, isDate, localInput, visibilityField, wallInstant, type EventItem, type EventSuggestion } from "@/lib/planner";
import { createClient } from "@/lib/supabase/client";
import type { PersonalTiming } from "@/lib/personal-repeats";

export type EventDraft = { date: string; time?: string };

const suggestions = ["Gym", "Study", "Appointment"];

export default function EventForm({ initialEvent, draft, suggestion, refreshPage = true, onCancel, onSaved }: {
  initialEvent?: EventItem; draft?: EventDraft; suggestion?: EventSuggestion;
  refreshPage?: boolean; onCancel?: () => void; onSaved?: (date: string, timing: PersonalTiming) => void;
}) {
  const { save, saving, error, setError, notice } = useSaveRecord("events", refreshPage);
  const originalStart = initialEvent ? localInput(initialEvent.starts_at) : "";
  const originalEnd = initialEvent ? localInput(initialEvent.ends_at) : "";
  const [startDay, startTime] = originalStart ? originalStart.split("T") : [draft?.date ?? "", draft?.time ?? ""];
  const [endDay, endTime] = originalEnd ? originalEnd.split("T") : ["", ""];
  const [title, setTitle] = useState(initialEvent?.title ?? "");
  const [anotherDay, setAnotherDay] = useState(!!endDay && endDay !== startDay);
  const [repeat, setRepeat] = useState(initialEvent?.repeat_until ? String(initialEvent.repeat_every_weeks) : "0");
  const repeatId = useId();
  const [sending, setSending] = useState(false);
  const working = saving || sending;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    try {
      const eventTitle = field(fields, "title");
      if (!eventTitle) throw new Error("Enter an event title.");
      const date = field(fields, "date");
      const from = field(fields, "start_time");
      const to = field(fields, "end_time");
      const endDate = anotherDay ? field(fields, "end_date") : date;
      const starts_at = initialEvent && date + "T" + from === originalStart
        ? initialEvent.starts_at : wallInstant(date, from);
      const ends_at = initialEvent && endDate + "T" + to === originalEnd
        ? initialEvent.ends_at : wallInstant(endDate, to);
      if (new Date(ends_at) <= new Date(starts_at)) {
        throw new Error("End must be after start. For an overnight event, choose a different end date.");
      }

      if (suggestion) {
        setSending(true);
        setError("");
        try {
          const { error: sendError } = await createClient().rpc("propose_calendar_event", {
            p_share_id: suggestion.shareId, p_title: eventTitle, p_start: starts_at, p_end: ends_at,
            p_body: field(fields, "message"), p_event_id: suggestion.eventId ?? null,
            p_expected: suggestion.revision ?? null,
          });
          if (sendError) {
            setError(sendError.code === "P0001" ? sendError.message : "Could not send the suggestion. Try again.");
            return;
          }
          onSaved?.(date, { starts_at, ends_at, repeat_until: null, repeat_every_weeks: 1 });
        } finally {
          setSending(false);
        }
        return;
      }

      const repeat_until = repeat === "0" ? null : field(fields, "repeat_until");
      if (repeat_until !== null && (!isDate(repeat_until) || repeat_until < date)) {
        throw new Error("Choose a repeat end date on or after the event date.");
      }
      const values = {
        title: eventTitle, starts_at, ends_at, repeat_until, repeat_every_weeks: repeat === "2" ? 2 : 1,
        location: field(fields, "location"), notes: field(fields, "notes"),
        visibility: visibilityField(fields),
      };

      if (await save(initialEvent ? values : { ...values, category: "personal" }, initialEvent?.id)) {
        if (!initialEvent) {
          form.reset();
          setTitle("");
          setAnotherDay(false);
          setRepeat("0");
        }
        onSaved?.(date, values);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Check the event details.");
    }
  }

  return (
    <form onSubmit={submit}>
      <fieldset disabled={working} className="space-y-4">
        {!initialEvent && (
          <div className="flex flex-wrap items-center gap-2" aria-label="Event title suggestions">
            <span className="text-xs font-semibold text-slate-600">Quick titles</span>
            {suggestions.map((suggestion) => (
              <button key={suggestion} type="button" className="button-quiet rounded-full bg-brand-50 text-xs text-brand-900"
                onClick={() => setTitle(suggestion)}>{suggestion}</button>
            ))}
          </div>
        )}
        <Field label="Event title">
          <input className="control" name="title" required maxLength={200} value={title}
            onChange={(event) => setTitle(event.target.value)} placeholder="Gym, dinner, or study group" />
        </Field>
        <Field label="Date"><input className="control" name="date" type="date" required defaultValue={startDay} /></Field>
        <div className="grid gap-3 min-[350px]:grid-cols-2">
          <Field label="Start time"><input className="control" name="start_time" type="time" required defaultValue={startTime} /></Field>
          <Field label="End time"><input className="control" name="end_time" type="time" required defaultValue={endTime} /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" className="accent-brand-700" checked={anotherDay}
            onChange={(event) => setAnotherDay(event.target.checked)} />Ends on another day
        </label>
        {anotherDay && (
          <Field label="End date"><input className="control" name="end_date" type="date" required defaultValue={endDay || undefined} /></Field>
        )}
        {!suggestion && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-800" htmlFor={repeatId}>Repeat</label>
              <select id={repeatId} className="control" value={repeat} onChange={(event) => setRepeat(event.target.value)}>
                <option value="0">Does not repeat</option>
                <option value="1">Every week</option>
                <option value="2">Every other week</option>
              </select>
            </div>
            {repeat !== "0" && (
              <Field label="Repeat through">
                <input className="control" name="repeat_until" type="date" required defaultValue={initialEvent?.repeat_until ?? ""} />
              </Field>
            )}
          </>
        )}
        {suggestion ? (
          <Field label="Message (optional)"><textarea className="control" name="message" rows={3} maxLength={1000}
            placeholder="Why does this time work better?" /></Field>
        ) : <details className="rounded-lg border border-[#e4ebeb] px-3 py-2.5" open={initialEvent ? true : undefined}>
          <summary className="cursor-pointer text-sm font-semibold text-brand-900">Location, notes, and sharing</summary>
          <div className="mt-3 space-y-3">
            <Field label="Location (optional)"><input className="control" name="location" maxLength={200}
              defaultValue={initialEvent?.location} /></Field>
            <Field label="Notes (optional)"><textarea className="control" name="notes" rows={3} maxLength={2000}
              defaultValue={initialEvent?.notes} /></Field>
            <VisibilityField value={initialEvent?.visibility} />
          </div>
        </details>}
        <FormActions saving={working} error={error} notice={notice} label={suggestion ? "Send suggestion" : "Add event"}
          editing={!!initialEvent && !suggestion} onCancel={onCancel} />
      </fieldset>
    </form>
  );
}
